<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

class RestaurantHandler {
    public static function createRestaurant($userId, $data) {
        // Validate input
        $errors = [];

        if (empty($data['name'])) {
            $errors[] = 'Restaurant name is required';
        }

        if (!empty($errors)) {
            return ['error' => implode(', ', $errors), 'code' => 400];
        }

        try {
            // Set defaults
            $plan = isset($data['plan']) && in_array($data['plan'], ['bistro', 'resto', 'gastro'])
                ? $data['plan']
                : 'bistro';

            $restaurantId = Database::insert(
                'INSERT INTO restaurants (owner_id, name, city, address, phone, plan, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    $userId,
                    $data['name'],
                    isset($data['city']) ? $data['city'] : null,
                    isset($data['address']) ? $data['address'] : null,
                    isset($data['phone']) ? $data['phone'] : null,
                    $plan,
                    'trial'
                ]
            );

            return [
                'id' => (int)$restaurantId,
                'owner_id' => (int)$userId,
                'name' => $data['name'],
                'city' => isset($data['city']) ? $data['city'] : null,
                'address' => isset($data['address']) ? $data['address'] : null,
                'phone' => isset($data['phone']) ? $data['phone'] : null,
                'plan' => $plan,
                'status' => 'trial',
                'code' => 201
            ];
        } catch (Exception $e) {
            return ['error' => 'Failed to create restaurant', 'code' => 500];
        }
    }

    public static function listRestaurants($userId) {
        try {
            $restaurants = Database::fetchAll(
                'SELECT id, owner_id, name, city, address, phone, plan, status, tables_count, created_at, updated_at
                 FROM restaurants WHERE owner_id = ? ORDER BY created_at DESC',
                [$userId]
            );

            return [
                'restaurants' => array_map(function($r) {
                    return [
                        'id' => (int)$r['id'],
                        'owner_id' => (int)$r['owner_id'],
                        'name' => $r['name'],
                        'city' => $r['city'],
                        'address' => $r['address'],
                        'phone' => $r['phone'],
                        'plan' => $r['plan'],
                        'status' => $r['status'],
                        'tables_count' => (int)$r['tables_count'],
                        'created_at' => $r['created_at'],
                        'updated_at' => $r['updated_at']
                    ];
                }, $restaurants),
                'code' => 200
            ];
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch restaurants', 'code' => 500];
        }
    }

    public static function getRestaurant($userId, $restaurantId) {
        try {
            $restaurant = Database::fetchOne(
                'SELECT id, owner_id, name, city, address, phone, plan, status, tables_count, stripe_customer_id, created_at, updated_at
                 FROM restaurants WHERE id = ? AND owner_id = ?',
                [$restaurantId, $userId]
            );

            if (!$restaurant) {
                return ['error' => 'Restaurant not found', 'code' => 404];
            }

            return [
                'id' => (int)$restaurant['id'],
                'owner_id' => (int)$restaurant['owner_id'],
                'name' => $restaurant['name'],
                'city' => $restaurant['city'],
                'address' => $restaurant['address'],
                'phone' => $restaurant['phone'],
                'plan' => $restaurant['plan'],
                'status' => $restaurant['status'],
                'tables_count' => (int)$restaurant['tables_count'],
                'stripe_customer_id' => $restaurant['stripe_customer_id'],
                'created_at' => $restaurant['created_at'],
                'updated_at' => $restaurant['updated_at'],
                'code' => 200
            ];
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch restaurant', 'code' => 500];
        }
    }

    public static function updateRestaurant($userId, $restaurantId, $data) {
        // Check ownership
        $restaurant = Database::fetchOne(
            'SELECT id, owner_id FROM restaurants WHERE id = ? AND owner_id = ?',
            [$restaurantId, $userId]
        );

        if (!$restaurant) {
            return ['error' => 'Restaurant not found', 'code' => 404];
        }

        try {
            $updateFields = [];
            $updateParams = [];

            if (isset($data['name'])) {
                $updateFields[] = 'name = ?';
                $updateParams[] = $data['name'];
            }

            if (isset($data['city'])) {
                $updateFields[] = 'city = ?';
                $updateParams[] = $data['city'];
            }

            if (isset($data['address'])) {
                $updateFields[] = 'address = ?';
                $updateParams[] = $data['address'];
            }

            if (isset($data['phone'])) {
                $updateFields[] = 'phone = ?';
                $updateParams[] = $data['phone'];
            }

            if (isset($data['plan']) && in_array($data['plan'], ['bistro', 'resto', 'gastro'])) {
                $updateFields[] = 'plan = ?';
                $updateParams[] = $data['plan'];
            }

            if (isset($data['status']) && in_array($data['status'], ['active', 'paused', 'trial', 'suspended'])) {
                $updateFields[] = 'status = ?';
                $updateParams[] = $data['status'];
            }

            if (isset($data['tables_count'])) {
                $updateFields[] = 'tables_count = ?';
                $updateParams[] = (int)$data['tables_count'];
            }

            if (empty($updateFields)) {
                return ['error' => 'No valid fields to update', 'code' => 400];
            }

            $updateParams[] = $restaurantId;
            $sql = 'UPDATE restaurants SET ' . implode(', ', $updateFields) . ' WHERE id = ?';

            Database::update($sql, $updateParams);

            // Fetch updated record
            $updated = Database::fetchOne(
                'SELECT id, owner_id, name, city, address, phone, plan, status, tables_count, stripe_customer_id, created_at, updated_at
                 FROM restaurants WHERE id = ?',
                [$restaurantId]
            );

            return [
                'id' => (int)$updated['id'],
                'owner_id' => (int)$updated['owner_id'],
                'name' => $updated['name'],
                'city' => $updated['city'],
                'address' => $updated['address'],
                'phone' => $updated['phone'],
                'plan' => $updated['plan'],
                'status' => $updated['status'],
                'tables_count' => (int)$updated['tables_count'],
                'stripe_customer_id' => $updated['stripe_customer_id'],
                'created_at' => $updated['created_at'],
                'updated_at' => $updated['updated_at'],
                'code' => 200
            ];
        } catch (Exception $e) {
            return ['error' => 'Failed to update restaurant', 'code' => 500];
        }
    }
}
