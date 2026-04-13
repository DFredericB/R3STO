<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

/**
 * Stripe configuration
 * Plans: Bistro 39 CHF, Resto 59 CHF, Gastro 79 CHF
 */
define('STRIPE_SECRET_KEY', 'sk_live_REPLACE_WITH_REAL_KEY');
define('STRIPE_WEBHOOK_SECRET', 'whsec_REPLACE_WITH_REAL_KEY');
define('STRIPE_PRICES', [
    'bistro' => 'price_bistro_39chf',
    'resto'  => 'price_resto_59chf',
    'gastro' => 'price_gastro_79chf',
]);

class MultisiteHandler {

    /**
     * Check if user can create additional restaurants
     * Gastro plan required for multi-site
     */
    public static function checkEligibility($userId) {
        try {
            // Get user's current restaurants
            $restaurants = Database::fetchAll(
                'SELECT id, name, plan, status FROM restaurants WHERE owner_id = ? ORDER BY created_at ASC',
                [$userId]
            );

            $count = count($restaurants);
            $hasGastro = false;

            foreach ($restaurants as $r) {
                if ($r['plan'] === 'gastro') {
                    $hasGastro = true;
                    break;
                }
            }

            // First restaurant is free (created during signup)
            // Additional restaurants require Gastro plan
            $canCreate = ($count === 0) || $hasGastro;

            return [
                'eligible' => $canCreate,
                'current_count' => $count,
                'has_gastro' => $hasGastro,
                'restaurants' => $restaurants,
                'message' => $canCreate
                    ? 'Vous pouvez créer un nouveau restaurant'
                    : 'Le plan Gastro est requis pour gérer plusieurs établissements',
                'code' => 200
            ];
        } catch (Exception $e) {
            return ['error' => 'Erreur de vérification', 'code' => 500];
        }
    }

    /**
     * Create a Stripe Checkout session for a new restaurant
     */
    public static function createCheckoutSession($userId, $data) {
        // Validate input
        $restaurantName = isset($data['name']) ? trim($data['name']) : '';
        if (empty($restaurantName)) {
            return ['error' => 'Nom du restaurant requis', 'code' => 400];
        }

        $plan = isset($data['plan']) ? trim($data['plan']) : 'resto';
        if (!in_array($plan, ['bistro', 'resto', 'gastro'])) {
            $plan = 'resto';
        }

        // Check eligibility
        $eligibility = self::checkEligibility($userId);
        if (!$eligibility['eligible']) {
            return ['error' => $eligibility['message'], 'code' => 403];
        }

        // Get user email
        $user = Database::fetchOne('SELECT email, name FROM users WHERE id = ?', [$userId]);
        if (!$user) {
            return ['error' => 'Utilisateur non trouvé', 'code' => 404];
        }

        // Get or create Stripe customer ID
        $stripeCustomerId = self::getOrCreateStripeCustomer($userId, $user['email'], $user['name']);

        // Create pending restaurant record
        try {
            $pendingId = Database::insert(
                'INSERT INTO restaurants (owner_id, name, city, address, phone, plan, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    $userId,
                    $restaurantName,
                    isset($data['city']) ? $data['city'] : null,
                    isset($data['address']) ? $data['address'] : null,
                    isset($data['phone']) ? $data['phone'] : null,
                    $plan,
                    'pending_payment'
                ]
            );
        } catch (Exception $e) {
            return ['error' => 'Erreur de création', 'code' => 500];
        }

        // Build Stripe Checkout Session
        $priceId = isset(STRIPE_PRICES[$plan]) ? STRIPE_PRICES[$plan] : STRIPE_PRICES['resto'];

        $checkoutData = [
            'customer' => $stripeCustomerId,
            'payment_method_types' => ['card'],
            'line_items' => [[
                'price' => $priceId,
                'quantity' => 1,
            ]],
            'mode' => 'subscription',
            'success_url' => 'https://app.r3sto.ch/multisite?success=1&restaurant_id=' . $pendingId,
            'cancel_url' => 'https://app.r3sto.ch/multisite?cancelled=1&restaurant_id=' . $pendingId,
            'metadata' => [
                'user_id' => (string)$userId,
                'restaurant_id' => (string)$pendingId,
                'plan' => $plan,
            ],
            'subscription_data' => [
                'metadata' => [
                    'user_id' => (string)$userId,
                    'restaurant_id' => (string)$pendingId,
                    'plan' => $plan,
                ],
            ],
        ];

        try {
            $session = self::stripeRequest('POST', '/v1/checkout/sessions', $checkoutData);

            if (isset($session['error'])) {
                // Rollback pending restaurant
                Database::update('DELETE FROM restaurants WHERE id = ? AND status = ?', [$pendingId, 'pending_payment']);
                return ['error' => 'Erreur Stripe: ' . ($session['error']['message'] ?? 'unknown'), 'code' => 500];
            }

            // Store checkout session ID
            Database::update(
                'UPDATE restaurants SET stripe_customer_id = ? WHERE id = ?',
                [$session['id'], $pendingId]
            );

            return [
                'checkout_url' => $session['url'],
                'session_id' => $session['id'],
                'restaurant_id' => (int)$pendingId,
                'plan' => $plan,
                'code' => 200
            ];
        } catch (Exception $e) {
            Database::update('DELETE FROM restaurants WHERE id = ? AND status = ?', [$pendingId, 'pending_payment']);
            return ['error' => 'Erreur de création du paiement', 'code' => 500];
        }
    }

    /**
     * Handle Stripe webhook events
     */
    public static function handleWebhook($rawBody, $sigHeader) {
        // Verify webhook signature
        if (!self::verifyWebhookSignature($rawBody, $sigHeader)) {
            return ['error' => 'Invalid signature', 'code' => 400];
        }

        $event = json_decode($rawBody, true);
        if (!$event || !isset($event['type'])) {
            return ['error' => 'Invalid event', 'code' => 400];
        }

        $result = ['received' => true, 'type' => $event['type']];

        switch ($event['type']) {
            case 'checkout.session.completed':
                $session = $event['data']['object'];
                $metadata = $session['metadata'] ?? [];
                $restaurantId = isset($metadata['restaurant_id']) ? (int)$metadata['restaurant_id'] : 0;

                if ($restaurantId > 0) {
                    // Activate the restaurant
                    Database::update(
                        'UPDATE restaurants SET status = ?, stripe_customer_id = ? WHERE id = ?',
                        ['active', $session['customer'] ?? '', $restaurantId]
                    );
                    $result['restaurant_activated'] = $restaurantId;
                }
                break;

            case 'customer.subscription.deleted':
                $subscription = $event['data']['object'];
                $metadata = $subscription['metadata'] ?? [];
                $restaurantId = isset($metadata['restaurant_id']) ? (int)$metadata['restaurant_id'] : 0;

                if ($restaurantId > 0) {
                    // Suspend restaurant on subscription cancellation
                    Database::update(
                        'UPDATE restaurants SET status = ? WHERE id = ?',
                        ['suspended', $restaurantId]
                    );
                    $result['restaurant_suspended'] = $restaurantId;
                }
                break;

            case 'invoice.payment_failed':
                $invoice = $event['data']['object'];
                $subId = $invoice['subscription'] ?? '';
                if (!empty($subId)) {
                    // Get subscription metadata
                    $sub = self::stripeRequest('GET', '/v1/subscriptions/' . $subId);
                    $metadata = $sub['metadata'] ?? [];
                    $restaurantId = isset($metadata['restaurant_id']) ? (int)$metadata['restaurant_id'] : 0;

                    if ($restaurantId > 0) {
                        Database::update(
                            'UPDATE restaurants SET status = ? WHERE id = ?',
                            ['paused', $restaurantId]
                        );
                        $result['restaurant_paused'] = $restaurantId;
                    }
                }
                break;
        }

        $result['code'] = 200;
        return $result;
    }

    /**
     * Confirm payment and activate restaurant (called after redirect)
     */
    public static function confirmPayment($userId, $restaurantId) {
        try {
            $restaurant = Database::fetchOne(
                'SELECT id, status, stripe_customer_id FROM restaurants WHERE id = ? AND owner_id = ?',
                [$restaurantId, $userId]
            );

            if (!$restaurant) {
                return ['error' => 'Restaurant non trouvé', 'code' => 404];
            }

            // If already active, just return success
            if ($restaurant['status'] === 'active') {
                return ['confirmed' => true, 'status' => 'active', 'code' => 200];
            }

            // If pending_payment, check with Stripe if payment was made
            if ($restaurant['status'] === 'pending_payment' && !empty($restaurant['stripe_customer_id'])) {
                $sessionId = $restaurant['stripe_customer_id']; // We stored session_id here temporarily

                $session = self::stripeRequest('GET', '/v1/checkout/sessions/' . $sessionId);

                if (isset($session['payment_status']) && $session['payment_status'] === 'paid') {
                    // Activate
                    Database::update(
                        'UPDATE restaurants SET status = ?, stripe_customer_id = ? WHERE id = ?',
                        ['active', $session['customer'] ?? '', $restaurantId]
                    );
                    return ['confirmed' => true, 'status' => 'active', 'code' => 200];
                }

                return ['confirmed' => false, 'status' => 'pending_payment', 'code' => 200];
            }

            return ['confirmed' => false, 'status' => $restaurant['status'], 'code' => 200];
        } catch (Exception $e) {
            return ['error' => 'Erreur de vérification', 'code' => 500];
        }
    }

    /**
     * Cancel a pending restaurant (user cancelled checkout)
     */
    public static function cancelPending($userId, $restaurantId) {
        try {
            $deleted = Database::update(
                'DELETE FROM restaurants WHERE id = ? AND owner_id = ? AND status = ?',
                [$restaurantId, $userId, 'pending_payment']
            );

            return [
                'cancelled' => $deleted > 0,
                'code' => 200
            ];
        } catch (Exception $e) {
            return ['error' => 'Erreur', 'code' => 500];
        }
    }

    /**
     * Get or create Stripe customer
     */
    private static function getOrCreateStripeCustomer($userId, $email, $name) {
        // Check if user already has a Stripe customer from an existing restaurant
        $existing = Database::fetchOne(
            'SELECT stripe_customer_id FROM restaurants WHERE owner_id = ? AND stripe_customer_id IS NOT NULL AND stripe_customer_id != "" LIMIT 1',
            [$userId]
        );

        if ($existing && !empty($existing['stripe_customer_id']) && strpos($existing['stripe_customer_id'], 'cus_') === 0) {
            return $existing['stripe_customer_id'];
        }

        // Create new Stripe customer
        $customer = self::stripeRequest('POST', '/v1/customers', [
            'email' => $email,
            'name' => $name,
            'metadata' => ['user_id' => (string)$userId],
        ]);

        return isset($customer['id']) ? $customer['id'] : null;
    }

    /**
     * Make a Stripe API request
     */
    private static function stripeRequest($method, $path, $data = null) {
        $url = 'https://api.stripe.com' . $path;

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . STRIPE_SECRET_KEY,
            'Content-Type: application/x-www-form-urlencoded',
        ]);

        if ($method === 'POST' && $data) {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(self::flattenArray($data)));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $result = json_decode($response, true);
        return $result ?: ['error' => ['message' => 'Invalid response'], 'http_code' => $httpCode];
    }

    /**
     * Flatten nested array for Stripe form encoding
     */
    private static function flattenArray($arr, $prefix = '') {
        $result = [];
        foreach ($arr as $key => $value) {
            $newKey = $prefix ? $prefix . '[' . $key . ']' : $key;
            if (is_array($value)) {
                $result = array_merge($result, self::flattenArray($value, $newKey));
            } else {
                $result[$newKey] = $value;
            }
        }
        return $result;
    }

    /**
     * Verify Stripe webhook signature
     */
    private static function verifyWebhookSignature($payload, $sigHeader) {
        if (empty($sigHeader) || STRIPE_WEBHOOK_SECRET === 'whsec_REPLACE_WITH_REAL_KEY') {
            // Skip verification in dev mode
            return true;
        }

        $parts = [];
        foreach (explode(',', $sigHeader) as $item) {
            list($k, $v) = explode('=', $item, 2);
            $parts[$k] = $v;
        }

        $timestamp = isset($parts['t']) ? $parts['t'] : '';
        $sig = isset($parts['v1']) ? $parts['v1'] : '';

        if (empty($timestamp) || empty($sig)) return false;

        // Check timestamp tolerance (5 minutes)
        if (abs(time() - (int)$timestamp) > 300) return false;

        $signedPayload = $timestamp . '.' . $payload;
        $expected = hash_hmac('sha256', $signedPayload, STRIPE_WEBHOOK_SECRET);

        return hash_equals($expected, $sig);
    }
}
