<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

class SetupHandler {
    public static function validateSetupKey($providedKey) {
        return $providedKey === SETUP_KEY;
    }

    public static function createTables() {
        $results = [];

        try {
            // Create users table
            Database::query(
                'CREATE TABLE IF NOT EXISTS users (
                  id INT AUTO_INCREMENT PRIMARY KEY,
                  email VARCHAR(255) NOT NULL UNIQUE,
                  password_hash VARCHAR(255) NOT NULL,
                  name VARCHAR(255) NOT NULL,
                  role ENUM("user", "admin", "superadmin") DEFAULT "user",
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  INDEX idx_email (email)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
            );
            $results['users_table'] = 'created';
        } catch (Exception $e) {
            $results['users_table'] = 'error: ' . $e->getMessage();
        }

        try {
            // Create restaurants table
            Database::query(
                'CREATE TABLE IF NOT EXISTS restaurants (
                  id INT AUTO_INCREMENT PRIMARY KEY,
                  owner_id INT NOT NULL,
                  name VARCHAR(255) NOT NULL,
                  city VARCHAR(255),
                  address TEXT,
                  phone VARCHAR(50),
                  plan ENUM("bistro", "resto", "gastro") DEFAULT "bistro",
                  status ENUM("active", "paused", "trial", "suspended") DEFAULT "trial",
                  tables_count INT DEFAULT 0,
                  stripe_customer_id VARCHAR(255),
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  FOREIGN KEY (owner_id) REFERENCES users(id),
                  INDEX idx_owner_id (owner_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
            );
            $results['restaurants_table'] = 'created';
        } catch (Exception $e) {
            $results['restaurants_table'] = 'error: ' . $e->getMessage();
        }

        try {
            // Create sessions table
            Database::query(
                'CREATE TABLE IF NOT EXISTS sessions (
                  id INT AUTO_INCREMENT PRIMARY KEY,
                  user_id INT NOT NULL,
                  token_hash VARCHAR(255) NOT NULL,
                  expires_at TIMESTAMP NOT NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (user_id) REFERENCES users(id),
                  INDEX idx_user_id (user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
            );
            $results['sessions_table'] = 'created';
        } catch (Exception $e) {
            $results['sessions_table'] = 'error: ' . $e->getMessage();
        }

        return $results;
    }

    public static function createDefaultAdmin() {
        try {
            // Check if superadmin already exists
            $existing = Database::fetchOne(
                'SELECT id FROM users WHERE email = ?',
                ['didier@r3sto.com']
            );

            if ($existing) {
                return ['status' => 'admin user already exists'];
            }

            // Generate hash for password 'R3STO2026!'
            $passwordHash = password_hash('R3STO2026!', PASSWORD_DEFAULT);

            Database::insert(
                'INSERT INTO users (email, password_hash, name, role)
                 VALUES (?, ?, ?, ?)',
                ['didier@r3sto.com', $passwordHash, 'Didier Genoud', 'superadmin']
            );

            return ['status' => 'admin user created', 'email' => 'didier@r3sto.com'];
        } catch (Exception $e) {
            return ['status' => 'error creating admin: ' . $e->getMessage()];
        }
    }

    public static function runSetup() {
        $output = [
            'tables' => self::createTables(),
            'admin' => self::createDefaultAdmin(),
            'timestamp' => date('Y-m-d H:i:s'),
            'code' => 200
        ];

        return $output;
    }
}
