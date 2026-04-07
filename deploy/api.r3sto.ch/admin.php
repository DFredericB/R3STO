<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

class AdminHandler {
    public static function checkAdminRole($role) {
        return in_array($role, ['admin', 'superadmin']);
    }

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

    public static function getStats() {
        try {
            $stats = [];

            // Total clients
            $totalClients = Database::fetchOne(
                'SELECT COUNT(DISTINCT owner_id) as count FROM restaurants'
            );
            $stats['total_clients'] = (int)$totalClients['count'];

            // Total restaurants
            $totalRestaurants = Database::fetchOne(
                'SELECT COUNT(*) as count FROM restaurants'
            );
            $stats['total_restaurants'] = (int)$totalRestaurants['count'];

            // Active restaurants
            $activeRestaurants = Database::fetchOne(
                'SELECT COUNT(*) as count FROM restaurants WHERE status = "active"'
            );
            $stats['active_restaurants'] = (int)$activeRestaurants['count'];

            // Trial restaurants
            $trialRestaurants = Database::fetchOne(
                'SELECT COUNT(*) as count FROM restaurants WHERE status = "trial"'
            );
            $stats['trial_restaurants'] = (int)$trialRestaurants['count'];

            // Restaurants by plan
            $byPlan = Database::fetchAll(
                'SELECT plan, COUNT(*) as count FROM restaurants GROUP BY plan'
            );
            $stats['by_plan'] = [];
            foreach ($byPlan as $p) {
                $stats['by_plan'][$p['plan']] = (int)$p['count'];
            }

            // Total users
            $totalUsers = Database::fetchOne(
                'SELECT COUNT(*) as count FROM users'
            );
            $stats['total_users'] = (int)$totalUsers['count'];

            return array_merge($stats, ['code' => 200]);
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch stats', 'code' => 500];
        }
    }
}
