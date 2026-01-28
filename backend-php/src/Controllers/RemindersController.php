<?php

class RemindersController
{
    public static function run($pdo, $whatsappConfig)
    {
        $limit = Request::query('limit', 50);
        $limit = is_numeric($limit) ? (int) $limit : 50;
        if ($limit < 1) {
            $limit = 1;
        }
        if ($limit > 200) {
            $limit = 200;
        }

        $stmt = $pdo->prepare(
            'SELECT r.*, u.phone, u.first_name, u.last_name
             FROM reminders r
             JOIN users u ON u.id = r.user_id
             WHERE r.is_sent = 0 AND r.scheduled_for <= NOW()
             ORDER BY r.scheduled_for ASC
             LIMIT ?'
        );
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        $reminders = $stmt->fetchAll();

        $client = new WhatsAppClient($whatsappConfig);
        $sent = 0;
        $failed = 0;

        foreach ($reminders as $reminder) {
            $phone = $reminder['phone'];
            if (!$phone) {
                self::markFailed($pdo, $reminder['id'], 'Missing phone');
                $failed++;
                continue;
            }

            $result = $client->sendText($phone, $reminder['message']);
            if ($result['ok']) {
                $update = $pdo->prepare('UPDATE reminders SET is_sent = 1, sent_at = NOW() WHERE id = ?');
                $update->execute([$reminder['id']]);
                $sent++;
            } else {
                $error = isset($result['error']) ? $result['error'] : 'Unknown error';
                self::markFailed($pdo, $reminder['id'], $error);
                $failed++;
            }
        }

        Response::json([
            'processed' => count($reminders),
            'sent' => $sent,
            'failed' => $failed,
        ]);
    }

    private static function markFailed($pdo, $reminderId, $error)
    {
        $stmt = $pdo->prepare(
            'UPDATE reminders SET attempts = attempts + 1, last_error = ? WHERE id = ?'
        );
        $stmt->execute([$error, $reminderId]);
    }
}
