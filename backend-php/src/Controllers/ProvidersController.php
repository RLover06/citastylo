<?php

class ProvidersController
{
    public static function list($pdo)
    {
        $stmt = $pdo->query(
            'SELECT pp.*, u.first_name, u.last_name, u.email, u.phone
             FROM provider_profiles pp
             JOIN users u ON u.id = pp.user_id'
        );
        $rows = $stmt->fetchAll();

        $providers = array_map(function ($row) {
            return [
                'id' => (int) $row['id'],
                'businessName' => $row['business_name'],
                'description' => $row['description'],
                'services' => json_decode($row['services'], true) ?: [],
                'address' => $row['address'],
                'city' => $row['city'],
                'country' => $row['country'],
                'user' => [
                    'id' => (int) $row['user_id'],
                    'firstName' => $row['first_name'],
                    'lastName' => $row['last_name'],
                    'email' => $row['email'],
                    'phone' => $row['phone'],
                ],
            ];
        }, $rows);

        Response::json($providers);
    }

    public static function get($pdo, $id)
    {
        $stmt = $pdo->prepare(
            'SELECT pp.*, u.first_name, u.last_name, u.email, u.phone
             FROM provider_profiles pp
             JOIN users u ON u.id = pp.user_id
             WHERE pp.id = ?'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error('Provider not found', 404);
        }

        Response::json([
            'id' => (int) $row['id'],
            'businessName' => $row['business_name'],
            'description' => $row['description'],
            'services' => json_decode($row['services'], true) ?: [],
            'address' => $row['address'],
            'city' => $row['city'],
            'country' => $row['country'],
            'user' => [
                'id' => (int) $row['user_id'],
                'firstName' => $row['first_name'],
                'lastName' => $row['last_name'],
                'email' => $row['email'],
                'phone' => $row['phone'],
            ],
        ]);
    }

    public static function setAvailability($pdo, $providerId, $data)
    {
        $missing = Validators::requireFields($data, ['dayOfWeek', 'startTime', 'endTime']);
        if (!empty($missing)) {
            Response::error('Missing fields: ' . implode(', ', $missing), 422);
        }

        $dayOfWeek = (int) $data['dayOfWeek'];
        if ($dayOfWeek < 0 || $dayOfWeek > 6) {
            Response::error('Invalid dayOfWeek', 422);
        }

        if (!Validators::isTime($data['startTime']) || !Validators::isTime($data['endTime'])) {
            Response::error('Invalid time format', 422);
        }

        $provider = $pdo->prepare('SELECT id FROM provider_profiles WHERE id = ?');
        $provider->execute([$providerId]);
        if (!$provider->fetch()) {
            Response::error('Provider not found', 404);
        }

        $existing = $pdo->prepare('SELECT id FROM availability WHERE provider_id = ? AND day_of_week = ?');
        $existing->execute([$providerId, $dayOfWeek]);
        $row = $existing->fetch();

        if ($row) {
            $update = $pdo->prepare(
                'UPDATE availability SET start_time = ?, end_time = ?, is_active = 1 WHERE id = ?'
            );
            $update->execute([$data['startTime'], $data['endTime'], $row['id']]);
        } else {
            $insert = $pdo->prepare(
                'INSERT INTO availability (provider_id, day_of_week, start_time, end_time, is_active)
                 VALUES (?, ?, ?, ?, 1)'
            );
            $insert->execute([$providerId, $dayOfWeek, $data['startTime'], $data['endTime']]);
        }

        Response::json(['status' => 'ok']);
    }

    public static function getAvailability($pdo, $providerId)
    {
        $stmt = $pdo->prepare(
            'SELECT id, day_of_week, start_time, end_time, is_active
             FROM availability
             WHERE provider_id = ?
             ORDER BY day_of_week ASC'
        );
        $stmt->execute([$providerId]);
        $rows = $stmt->fetchAll();

        Response::json($rows);
    }
}
