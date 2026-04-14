<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

class JWTHandler {
    public static function generateJWT($userId, $email, $role) {
        $header = self::base64urlEncode(json_encode([
            'typ' => 'JWT',
            'alg' => 'HS256'
        ]));

        $payload = self::base64urlEncode(json_encode([
            'user_id' => (int)$userId,
            'email' => $email,
            'role' => $role,
            'iat' => time(),
            'exp' => time() + (30 * 24 * 60 * 60) // 30 days
        ]));

        $signature = self::base64urlEncode(
            hash_hmac('sha256', $header . '.' . $payload, JWT_SECRET, true)
        );

        return $header . '.' . $payload . '.' . $signature;
    }

    public static function verifyJWT($token) {
        if (empty($token)) {
            return null;
        }

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        list($header, $payload, $signature) = $parts;

        // Verify signature
        $expectedSignature = self::base64urlEncode(
            hash_hmac('sha256', $header . '.' . $payload, JWT_SECRET, true)
        );

        if (!hash_equals($signature, $expectedSignature)) {
            return null;
        }

        // Decode payload
        $decodedPayload = json_decode(self::base64urlDecode($payload), true);

        // Check expiration
        if (isset($decodedPayload['exp']) && $decodedPayload['exp'] < time()) {
            return null;
        }

        return $decodedPayload;
    }

    public static function getAuthUser($headers) {
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';

        if (empty($authHeader)) {
            return null;
        }

        if (strpos($authHeader, 'Bearer ') !== 0) {
            return null;
        }

        $token = substr($authHeader, 7);
        return self::verifyJWT($token);
    }

    private static function base64urlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64urlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 4 - strlen($data) % 4));
    }
}

class AuthHandler {
    public static function register($data) {
        // Validate input
        $errors = [];

        if (empty($data['email'])) {
            $errors[] = 'Email is required';
        } elseif (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Invalid email format';
        }

        if (empty($data['password'])) {
            $errors[] = 'Password is required';
        } elseif (strlen($data['password']) < 8) {
            $errors[] = 'Password must be at least 8 characters';
        }

        if (empty($data['name'])) {
            $errors[] = 'Name is required';
        }

        if (!empty($errors)) {
            return ['error' => implode(', ', $errors), 'code' => 400];
        }

        // Check if email exists
        $existing = Database::fetchOne(
            'SELECT id FROM users WHERE email = ?',
            [$data['email']]
        );

        if ($existing) {
            return ['error' => 'Email already registered', 'code' => 400];
        }

        // Create user
        try {
            $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);

            $userId = Database::insert(
                'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
                [$data['email'], $passwordHash, $data['name'], 'user']
            );

            $token = JWTHandler::generateJWT($userId, $data['email'], 'user');

            return [
                'user_id' => (int)$userId,
                'email' => $data['email'],
                'name' => $data['name'],
                'role' => 'user',
                'token' => $token,
                'code' => 201
            ];
        } catch (Exception $e) {
            return ['error' => 'Registration failed', 'code' => 500];
        }
    }

    public static function login($data) {
        // Validate input
        if (empty($data['email']) || empty($data['password'])) {
            return ['error' => 'Email and password required', 'code' => 400];
        }

        try {
            $user = Database::fetchOne(
                'SELECT id, email, password_hash, name, role FROM users WHERE email = ?',
                [$data['email']]
            );

            if (!$user || !password_verify($data['password'], $user['password_hash'])) {
                return ['error' => 'Invalid credentials', 'code' => 401];
            }

            $token = JWTHandler::generateJWT($user['id'], $user['email'], $user['role']);

            return [
                'user_id' => (int)$user['id'],
                'email' => $user['email'],
                'name' => $user['name'],
                'role' => $user['role'],
                'token' => $token,
                'code' => 200
            ];
        } catch (Exception $e) {
            return ['error' => 'Login failed', 'code' => 500];
        }
    }

    public static function getMe($userId) {
        try {
            $user = Database::fetchOne(
                'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
                [$userId]
            );

            if (!$user) {
                return ['error' => 'User not found', 'code' => 404];
            }

            return [
                'user_id' => (int)$user['id'],
                'email' => $user['email'],
                'name' => $user['name'],
                'role' => $user['role'],
                'created_at' => $user['created_at'],
                'code' => 200
            ];
        } catch (Exception $e) {
            return ['error' => 'Failed to fetch user', 'code' => 500];
        }
    }
}
