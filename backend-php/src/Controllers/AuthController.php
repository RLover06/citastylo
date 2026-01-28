<?php

class AuthController
{
    public static function register($pdo, $data)
    {
        $missing = Validators::requireFields($data, ['email', 'password', 'firstName', 'lastName', 'role']);
        if (!empty($missing)) {
            Response::error('Missing fields: ' . implode(', ', $missing), 422);
        }

        if (!Validators::isEmail($data['email'])) {
            Response::error('Invalid email', 422);
        }

        $role = strtoupper($data['role']);
        if (!in_array($role, ['CLIENT', 'PROVIDER'], true)) {
            Response::error('Invalid role', 422);
        }

        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$data['email']]);
        if ($stmt->fetch()) {
            Response::error('Email already exists', 409);
        }

        $hash = password_hash($data['password'], PASSWORD_BCRYPT);

        try {
            $pdo->beginTransaction();

            $insertUser = $pdo->prepare(
                'INSERT INTO users (email, password, role, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?, ?)'
            );
            $insertUser->execute([
                $data['email'],
                $hash,
                $role,
                $data['firstName'],
                $data['lastName'],
                isset($data['phone']) ? $data['phone'] : null,
            ]);

            $userId = (int) $pdo->lastInsertId();

            if ($role === 'PROVIDER') {
                $services = isset($data['services']) && is_array($data['services']) ? $data['services'] : [];
                $insertProfile = $pdo->prepare(
                    'INSERT INTO provider_profiles (user_id, business_name, description, services, address, city, country)
                     VALUES (?, ?, ?, ?, ?, ?, ?)'
                );
                $insertProfile->execute([
                    $userId,
                    isset($data['businessName']) ? $data['businessName'] : null,
                    isset($data['description']) ? $data['description'] : null,
                    json_encode($services),
                    isset($data['address']) ? $data['address'] : null,
                    isset($data['city']) ? $data['city'] : null,
                    isset($data['country']) ? $data['country'] : null,
                ]);
            }

            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            Response::error('Registration failed', 500);
        }

        $token = bin2hex(random_bytes(32));
        Response::json([
            'access_token' => $token,
            'user' => [
                'id' => $userId,
                'email' => $data['email'],
                'role' => $role,
                'firstName' => $data['firstName'],
                'lastName' => $data['lastName'],
            ],
        ], 201);
    }

    public static function login($pdo, $data)
    {
        $missing = Validators::requireFields($data, ['email', 'password']);
        if (!empty($missing)) {
            Response::error('Missing fields: ' . implode(', ', $missing), 422);
        }

        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$data['email']]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($data['password'], $user['password'])) {
            Response::error('Invalid credentials', 401);
        }

        $token = bin2hex(random_bytes(32));
        Response::json([
            'access_token' => $token,
            'user' => [
                'id' => (int) $user['id'],
                'email' => $user['email'],
                'role' => $user['role'],
                'firstName' => $user['first_name'],
                'lastName' => $user['last_name'],
            ],
        ]);
    }
}
