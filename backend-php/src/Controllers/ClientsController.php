<?php

class ClientsController
{
    public static function get($pdo, $id)
    {
        $stmt = $pdo->prepare('SELECT id, email, role, first_name, last_name, phone, created_at FROM users WHERE id = ? AND role = ?');
        $stmt->execute([$id, 'CLIENT']);
        $user = $stmt->fetch();

        if (!$user) {
            Response::error('Client not found', 404);
        }

        Response::json([
            'id' => (int) $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'firstName' => $user['first_name'],
            'lastName' => $user['last_name'],
            'phone' => $user['phone'],
            'createdAt' => $user['created_at'],
        ]);
    }
}
