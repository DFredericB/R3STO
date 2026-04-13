<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

class AdminHandler {
    public static function checkAdminRole($role) {
        return in_array($role, ['admin', 'superadmin']);
    }

    // ── GET /admin/clients ──
    public static function getClients() {
        try {
            $clients = Database::fetchAll(
                'SELECT r.id, r.owner_id, r.name, r.city, r.plan, r.status, r.created_at,
                        u.email, u.name as owner_name
                 FROM restaurants r
                 JOIN users u ON r.owner_id = u.id
                 ORDER BY r.created_at DESC'
            );
            return [
                'clients' => array_map(function($c) {
                    return [
                        'id' => (int)$c['id'],
                        'owner_id' => (int)$c['owner_id'],
                        'owner_name' => $c['owner_name'],
                        'owner_email' => $c['email'],
                        'name' => $c['name'],
                        'city' => $c['city'],
                        'plan' => $c['plan'],
                        'status' => $c['status'],
                        'created_at' => $c['created_at']
                    ];
                }, $clients),
                'code' => 200
            ];
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch clients', 'code' => 500];
        }
    }

    // ── GET /admin/users ──
    public static function getUsers() {
        try {
            $users = Database::fetchAll(
                'SELECT u.id, u.email, u.name, u.role, u.created_at,
                        COUNT(r.id) as restaurant_count,
                        GROUP_CONCAT(r.name SEPARATOR ", ") as restaurant_names
                 FROM users u
                 LEFT JOIN restaurants r ON r.owner_id = u.id
                 GROUP BY u.id
                 ORDER BY u.created_at DESC'
            );
            return [
                'users' => array_map(function($u) {
                    return [
                        'id' => (int)$u['id'],
                        'email' => $u['email'],
                        'name' => $u['name'],
                        'role' => $u['role'],
                        'created_at' => $u['created_at'],
                        'restaurant_count' => (int)$u['restaurant_count'],
                        'restaurant_names' => $u['restaurant_names']
                    ];
                }, $users),
                'code' => 200
            ];
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch users', 'code' => 500];
        }
    }

    // ── GET /admin/financials ──
    public static function getFinancials() {
        try {
            $planPrices = ['bistro' => 39, 'resto' => 59, 'gastro' => 79];

            $byPlan = Database::fetchAll(
                'SELECT plan, status, COUNT(*) as count
                 FROM restaurants WHERE status IN ("active", "trial")
                 GROUP BY plan, status'
            );
            $mrrBreakdown = [];
            $totalMRR = 0;
            foreach ($byPlan as $row) {
                $price = isset($planPrices[$row['plan']]) ? $planPrices[$row['plan']] : 0;
                $subtotal = $price * (int)$row['count'];
                $totalMRR += $subtotal;
                $mrrBreakdown[] = [
                    'plan' => $row['plan'], 'status' => $row['status'],
                    'count' => (int)$row['count'], 'unit_price' => $price, 'subtotal' => $subtotal
                ];
            }

            $byStatus = Database::fetchAll('SELECT status, COUNT(*) as count FROM restaurants GROUP BY status');
            $statusMap = [];
            foreach ($byStatus as $s) { $statusMap[$s['status']] = (int)$s['count']; }

            $recentSignups = Database::fetchOne(
                'SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
            );
            $totalUsers = Database::fetchOne('SELECT COUNT(*) as count FROM users');
            $totalRestos = Database::fetchOne('SELECT COUNT(*) as count FROM restaurants');

            return [
                'mrr' => $totalMRR, 'arr' => $totalMRR * 12,
                'mrr_breakdown' => $mrrBreakdown, 'by_status' => $statusMap,
                'total_users' => (int)$totalUsers['count'],
                'total_restaurants' => (int)$totalRestos['count'],
                'signups_30d' => (int)$recentSignups['count'],
                'plan_prices' => $planPrices, 'currency' => 'CHF', 'code' => 200
            ];
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch financials', 'code' => 500];
        }
    }

    // ── GET /admin/stats ──
    public static function getStats() {
        try {
            $stats = [];
            $stats['total_clients'] = (int)Database::fetchOne('SELECT COUNT(DISTINCT owner_id) as count FROM restaurants')['count'];
            $stats['total_restaurants'] = (int)Database::fetchOne('SELECT COUNT(*) as count FROM restaurants')['count'];
            $stats['active_restaurants'] = (int)Database::fetchOne('SELECT COUNT(*) as count FROM restaurants WHERE status = "active"')['count'];
            $stats['trial_restaurants'] = (int)Database::fetchOne('SELECT COUNT(*) as count FROM restaurants WHERE status = "trial"')['count'];
            $byPlan = Database::fetchAll('SELECT plan, COUNT(*) as count FROM restaurants GROUP BY plan');
            $stats['by_plan'] = [];
            foreach ($byPlan as $p) { $stats['by_plan'][$p['plan']] = (int)$p['count']; }
            $stats['total_users'] = (int)Database::fetchOne('SELECT COUNT(*) as count FROM users')['count'];
            return array_merge($stats, ['code' => 200]);
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch stats', 'code' => 500];
        }
    }

    // ── GET /admin/activities — Dernières actions (action_logs) ──
    public static function getActivities() {
        try {
            // Tente action_logs d'abord, sinon construit depuis users+restaurants récents
            $tableExists = Database::fetchOne("SHOW TABLES LIKE 'action_logs'");
            if ($tableExists) {
                $activities = Database::fetchAll(
                    'SELECT al.*, u.name as user_name, u.email
                     FROM action_logs al
                     LEFT JOIN users u ON al.user_id = u.id
                     ORDER BY al.created_at DESC LIMIT 50'
                );
                return ['activities' => $activities, 'code' => 200];
            }
            // Fallback: activités reconstituées depuis inscriptions récentes
            $recent = Database::fetchAll(
                'SELECT u.id, u.name, u.email, u.created_at, r.name as resto_name, r.plan
                 FROM users u LEFT JOIN restaurants r ON r.owner_id = u.id
                 ORDER BY u.created_at DESC LIMIT 20'
            );
            $activities = array_map(function($r) {
                return [
                    'type' => 'signup', 'user_name' => $r['name'], 'email' => $r['email'],
                    'detail' => $r['resto_name'] ? 'Restaurant: ' . $r['resto_name'] . ' (' . $r['plan'] . ')' : 'Inscription sans restaurant',
                    'created_at' => $r['created_at']
                ];
            }, $recent);
            return ['activities' => $activities, 'code' => 200];
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch activities', 'code' => 500];
        }
    }

    // ── GET /admin/invoices — Paiements réels ──
    public static function getInvoices() {
        try {
            $tableExists = Database::fetchOne("SHOW TABLES LIKE 'paiements'");
            if ($tableExists) {
                $invoices = Database::fetchAll(
                    'SELECT p.*, r.name as restaurant_name, u.email
                     FROM paiements p
                     LEFT JOIN restaurants r ON p.restaurant_id = r.id
                     LEFT JOIN users u ON r.owner_id = u.id
                     ORDER BY p.created_at DESC LIMIT 100'
                );
                return ['invoices' => $invoices, 'code' => 200];
            }
            // Pas de table paiements → retourne vide (mieux que du fake)
            return ['invoices' => [], 'message' => 'Table paiements not found', 'code' => 200];
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch invoices', 'code' => 500];
        }
    }

    // ── GET /admin/reservations/stats — Stats réservations agrégées ──
    public static function getReservationStats() {
        try {
            $tableExists = Database::fetchOne("SHOW TABLES LIKE 'reservations'");
            if (!$tableExists) {
                return ['stats' => [], 'message' => 'Table reservations not found', 'code' => 200];
            }

            // Total réservations
            $total = Database::fetchOne('SELECT COUNT(*) as count FROM reservations');

            // Par statut
            $byStatus = Database::fetchAll(
                'SELECT status, COUNT(*) as count FROM reservations GROUP BY status'
            );

            // Par restaurant (top 20)
            $byResto = Database::fetchAll(
                'SELECT r.name, COUNT(res.id) as count, r.id as restaurant_id
                 FROM reservations res
                 JOIN restaurants r ON res.restaurant_id = r.id
                 GROUP BY res.restaurant_id
                 ORDER BY count DESC LIMIT 20'
            );

            // 7 derniers jours
            $last7d = Database::fetchOne(
                'SELECT COUNT(*) as count FROM reservations
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
            );

            // 30 derniers jours
            $last30d = Database::fetchOne(
                'SELECT COUNT(*) as count FROM reservations
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
            );

            // Par jour (30 derniers jours)
            $daily = Database::fetchAll(
                'SELECT DATE(created_at) as day, COUNT(*) as count
                 FROM reservations
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                 GROUP BY DATE(created_at) ORDER BY day'
            );

            return [
                'total' => (int)$total['count'],
                'last_7d' => (int)$last7d['count'],
                'last_30d' => (int)$last30d['count'],
                'by_status' => $byStatus,
                'by_restaurant' => $byResto,
                'daily' => $daily,
                'code' => 200
            ];
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch reservation stats', 'code' => 500];
        }
    }

    // ── GET /admin/onboarding — Étapes onboarding par restaurant ──
    public static function getOnboarding() {
        try {
            $restaurants = Database::fetchAll(
                'SELECT r.id, r.name, r.plan, r.status, r.created_at,
                        u.email, u.name as owner_name,
                        (SELECT COUNT(*) FROM salles WHERE restaurant_id = r.id) as has_salles,
                        (SELECT COUNT(*) FROM services WHERE restaurant_id = r.id) as has_services,
                        (SELECT COUNT(*) FROM tables WHERE restaurant_id = r.id) as has_tables,
                        (SELECT COUNT(*) FROM menus WHERE restaurant_id = r.id) as has_menus
                 FROM restaurants r
                 JOIN users u ON r.owner_id = u.id
                 ORDER BY r.created_at DESC'
            );

            $onboarding = array_map(function($r) {
                $steps = [
                    ['name' => 'Inscription', 'done' => true],
                    ['name' => 'Salles configurées', 'done' => (int)$r['has_salles'] > 0],
                    ['name' => 'Services configurés', 'done' => (int)$r['has_services'] > 0],
                    ['name' => 'Tables configurées', 'done' => (int)$r['has_tables'] > 0],
                    ['name' => 'Menu créé', 'done' => (int)$r['has_menus'] > 0],
                ];
                $done = count(array_filter($steps, function($s) { return $s['done']; }));
                return [
                    'restaurant_id' => (int)$r['id'],
                    'restaurant_name' => $r['name'],
                    'owner' => $r['owner_name'],
                    'email' => $r['email'],
                    'plan' => $r['plan'],
                    'status' => $r['status'],
                    'created_at' => $r['created_at'],
                    'steps' => $steps,
                    'progress' => round($done / count($steps) * 100),
                    'complete' => $done === count($steps)
                ];
            }, $restaurants);

            return ['onboarding' => $onboarding, 'code' => 200];
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch onboarding', 'code' => 500];
        }
    }

    // ── GET /admin/audit-log — Journal d'audit ──
    public static function getAuditLog() {
        try {
            $tableExists = Database::fetchOne("SHOW TABLES LIKE 'action_logs'");
            if ($tableExists) {
                $logs = Database::fetchAll(
                    'SELECT al.*, u.name as user_name, u.email
                     FROM action_logs al
                     LEFT JOIN users u ON al.user_id = u.id
                     ORDER BY al.created_at DESC LIMIT 100'
                );
                return ['audit_log' => $logs, 'code' => 200];
            }
            return ['audit_log' => [], 'message' => 'Table action_logs not found', 'code' => 200];
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch audit log', 'code' => 500];
        }
    }

    // ── GET /admin/monitoring — Santé des sous-domaines (ping réel) ──
    public static function getMonitoring() {
        $subdomains = ['api', 'auth', 'app', 'admin', 'booking', 'demo', 'menu', 'bill', 'delivery'];
        $results = [];
        foreach ($subdomains as $sub) {
            $url = "https://{$sub}.r3sto.ch/";
            if ($sub === 'api') $url = "https://api.r3sto.ch/health";

            $start = microtime(true);
            $status = 'offline';
            $httpCode = 0;

            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 5,
                CURLOPT_CONNECTTIMEOUT => 3,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_NOBODY => ($sub !== 'api'),
            ]);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $responseTime = round((microtime(true) - $start) * 1000);
            $status = ($httpCode >= 200 && $httpCode < 400) ? 'online' : 'offline';

            $results[] = [
                'subdomain' => $sub,
                'url' => "https://{$sub}.r3sto.ch",
                'status' => $status,
                'http_code' => $httpCode,
                'response_time_ms' => $responseTime,
                'checked_at' => date('Y-m-d H:i:s')
            ];
        }
        return ['monitoring' => $results, 'code' => 200];
    }

    // ── GET /admin/crm — Contacts CRM ──
    public static function getCRM() {
        try {
            $tableExists = Database::fetchOne("SHOW TABLES LIKE 'crm_contacts'");
            if ($tableExists) {
                $contacts = Database::fetchAll(
                    'SELECT c.*,
                            (SELECT COUNT(*) FROM crm_interactions WHERE contact_id = c.id) as interaction_count
                     FROM crm_contacts c
                     ORDER BY c.created_at DESC LIMIT 100'
                );
                return ['contacts' => $contacts, 'code' => 200];
            }
            return ['contacts' => [], 'message' => 'Table crm_contacts not found', 'code' => 200];
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch CRM data', 'code' => 500];
        }
    }

    // ── GET /admin/newsletters — Campagnes newsletter ──
    public static function getNewsletters() {
        try {
            $tableExists = Database::fetchOne("SHOW TABLES LIKE 'crm_campaigns'");
            if ($tableExists) {
                $campaigns = Database::fetchAll(
                    'SELECT c.*,
                            (SELECT COUNT(*) FROM crm_sends WHERE campaign_id = c.id) as send_count,
                            (SELECT COUNT(*) FROM crm_sends WHERE campaign_id = c.id AND opened_at IS NOT NULL) as open_count
                     FROM crm_campaigns c
                     ORDER BY c.created_at DESC LIMIT 50'
                );
                return ['newsletters' => $campaigns, 'code' => 200];
            }
            return ['newsletters' => [], 'message' => 'Table crm_campaigns not found', 'code' => 200];
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch newsletters', 'code' => 500];
        }
    }

    // ── GET /admin/blacklist — Blacklist globale ──
    public static function getBlacklist() {
        try {
            $tableExists = Database::fetchOne("SHOW TABLES LIKE 'clients'");
            if ($tableExists) {
                $blacklisted = Database::fetchAll(
                    'SELECT c.id, c.name, c.email, c.phone, c.notes, c.created_at,
                            r.name as restaurant_name
                     FROM clients c
                     LEFT JOIN restaurants r ON c.restaurant_id = r.id
                     WHERE c.blacklisted = 1
                     ORDER BY c.created_at DESC LIMIT 100'
                );
                return ['blacklist' => $blacklisted, 'code' => 200];
            }
            return ['blacklist' => [], 'message' => 'Table clients not found', 'code' => 200];
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch blacklist', 'code' => 500];
        }
    }

    // ── Endpoints qui retournent vide (tables pas encore créées) ──
    // Mieux que du fake — l'admin sait que c'est vide au lieu de voir du faux

    public static function getTickets() {
        try {
            $tableExists = Database::fetchOne("SHOW TABLES LIKE 'tickets'");
            if ($tableExists) {
                $tickets = Database::fetchAll('SELECT * FROM tickets ORDER BY created_at DESC LIMIT 50');
                return ['tickets' => $tickets, 'code' => 200];
            }
            return ['tickets' => [], 'message' => 'Tickets system not yet configured', 'code' => 200];
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch tickets', 'code' => 500];
        }
    }

    public static function getSuggestions() {
        try {
            $tableExists = Database::fetchOne("SHOW TABLES LIKE 'suggestions'");
            if ($tableExists) {
                return ['suggestions' => Database::fetchAll('SELECT * FROM suggestions ORDER BY votes DESC'), 'code' => 200];
            }
            return ['suggestions' => [], 'message' => 'Suggestions system not yet configured', 'code' => 200];
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch suggestions', 'code' => 500];
        }
    }

    public static function getAlerts() {
        try {
            $tableExists = Database::fetchOne("SHOW TABLES LIKE 'alerts'");
            if ($tableExists) {
                return ['alerts' => Database::fetchAll('SELECT * FROM alerts ORDER BY created_at DESC LIMIT 50'), 'code' => 200];
            }
            return ['alerts' => [], 'code' => 200];
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch alerts', 'code' => 500];
        }
    }

    public static function getSurveys() {
        try {
            $tableExists = Database::fetchOne("SHOW TABLES LIKE 'survey_responses'");
            if ($tableExists) {
                return ['surveys' => Database::fetchAll('SELECT * FROM survey_responses ORDER BY created_at DESC'), 'code' => 200];
            }
            return ['surveys' => [], 'code' => 200];
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch surveys', 'code' => 500];
        }
    }
}
