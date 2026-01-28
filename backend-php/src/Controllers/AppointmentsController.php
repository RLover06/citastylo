<?php

class AppointmentsController
{
    public static function create($pdo, $data)
    {
        $missing = Validators::requireFields($data, [
            'clientId',
            'providerId',
            'date',
            'startTime',
            'endTime',
            'service',
        ]);
        if (!empty($missing)) {
            Response::error('Missing fields: ' . implode(', ', $missing), 422);
        }

        if (!Validators::isDate($data['date'])) {
            Response::error('Invalid date format', 422);
        }

        if (!Validators::isTime($data['startTime']) || !Validators::isTime($data['endTime'])) {
            Response::error('Invalid time format', 422);
        }

        $client = $pdo->prepare('SELECT id FROM users WHERE id = ? AND role = ?');
        $client->execute([(int) $data['clientId'], 'CLIENT']);
        if (!$client->fetch()) {
            Response::error('Client not found', 404);
        }

        $provider = $pdo->prepare('SELECT id FROM provider_profiles WHERE id = ?');
        $provider->execute([(int) $data['providerId']]);
        if (!$provider->fetch()) {
            Response::error('Provider not found', 404);
        }

        $dayOfWeek = (int) date('w', strtotime($data['date']));
        $availability = $pdo->prepare(
            'SELECT * FROM availability WHERE provider_id = ? AND day_of_week = ? AND is_active = 1 LIMIT 1'
        );
        $availability->execute([(int) $data['providerId'], $dayOfWeek]);
        $availabilityRow = $availability->fetch();

        if (!$availabilityRow) {
            Response::error('Provider not available on this day', 409);
        }

        if ($data['startTime'] < $availabilityRow['start_time'] || $data['endTime'] > $availabilityRow['end_time']) {
            Response::error('Time outside availability range', 409);
        }

        $conflict = $pdo->prepare(
            "SELECT id FROM appointments
             WHERE provider_id = ? AND date = ? AND status <> 'CANCELLED'
             AND NOT (end_time <= ? OR start_time >= ?)
             LIMIT 1"
        );
        $conflict->execute([
            (int) $data['providerId'],
            $data['date'],
            $data['startTime'],
            $data['endTime'],
        ]);
        if ($conflict->fetch()) {
            Response::error('Conflicting appointment', 409);
        }

        $insert = $pdo->prepare(
            'INSERT INTO appointments (client_id, provider_id, date, start_time, end_time, service, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $insert->execute([
            (int) $data['clientId'],
            (int) $data['providerId'],
            $data['date'],
            $data['startTime'],
            $data['endTime'],
            $data['service'],
            isset($data['notes']) ? $data['notes'] : null,
            'PENDING',
        ]);

        Response::json(['id' => (int) $pdo->lastInsertId()], 201);
    }

    public static function list($pdo)
    {
        $clientId = Request::query('clientId');
        $providerId = Request::query('providerId');

        if (!$clientId && !$providerId) {
            Response::error('clientId or providerId is required', 422);
        }

        if ($clientId) {
            $stmt = $pdo->prepare('SELECT * FROM appointments WHERE client_id = ? ORDER BY date DESC');
            $stmt->execute([(int) $clientId]);
        } else {
            $stmt = $pdo->prepare('SELECT * FROM appointments WHERE provider_id = ? ORDER BY date DESC');
            $stmt->execute([(int) $providerId]);
        }

        Response::json($stmt->fetchAll());
    }

    public static function get($pdo, $id)
    {
        $stmt = $pdo->prepare('SELECT * FROM appointments WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error('Appointment not found', 404);
        }

        Response::json($row);
    }

    public static function update($pdo, $id, $data)
    {
        $fields = [];
        $params = [];

        if (isset($data['status'])) {
            $status = strtoupper($data['status']);
            if (!in_array($status, ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'], true)) {
                Response::error('Invalid status', 422);
            }
            $fields[] = 'status = ?';
            $params[] = $status;
        }

        if (isset($data['notes'])) {
            $fields[] = 'notes = ?';
            $params[] = $data['notes'];
        }

        if (empty($fields)) {
            Response::error('No fields to update', 422);
        }

        $params[] = $id;
        $stmt = $pdo->prepare('UPDATE appointments SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);

        Response::json(['status' => 'ok']);
    }

    public static function delete($pdo, $id)
    {
        $stmt = $pdo->prepare('DELETE FROM appointments WHERE id = ?');
        $stmt->execute([$id]);
        Response::json(['status' => 'ok']);
    }

    public static function availableSlots($pdo)
    {
        $providerId = Request::query('providerId');
        $date = Request::query('date');

        if (!$providerId || !$date) {
            Response::error('providerId and date are required', 422);
        }

        if (!Validators::isDate($date)) {
            Response::error('Invalid date format', 422);
        }

        $dayOfWeek = (int) date('w', strtotime($date));
        $availability = $pdo->prepare(
            'SELECT * FROM availability WHERE provider_id = ? AND day_of_week = ? AND is_active = 1 LIMIT 1'
        );
        $availability->execute([(int) $providerId, $dayOfWeek]);
        $availabilityRow = $availability->fetch();

        if (!$availabilityRow) {
            Response::json([]);
        }

        $appointments = $pdo->prepare(
            "SELECT start_time, end_time FROM appointments
             WHERE provider_id = ? AND date = ? AND status <> 'CANCELLED'"
        );
        $appointments->execute([(int) $providerId, $date]);
        $existing = $appointments->fetchAll();

        $slots = [];
        $start = new DateTime($date . ' ' . $availabilityRow['start_time']);
        $end = new DateTime($date . ' ' . $availabilityRow['end_time']);
        $interval = new DateInterval('PT30M');

        while ($start < $end) {
            $slotStart = $start->format('H:i');
            $slotEnd = (clone $start)->add($interval)->format('H:i');

            $conflict = false;
            foreach ($existing as $apt) {
                if (!($apt['end_time'] <= $slotStart || $apt['start_time'] >= $slotEnd)) {
                    $conflict = true;
                    break;
                }
            }

            if (!$conflict) {
                $slots[] = $slotStart;
            }

            $start->add($interval);
        }

        Response::json($slots);
    }
}
