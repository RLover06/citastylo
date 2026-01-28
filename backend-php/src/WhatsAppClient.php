<?php

class WhatsAppClient
{
    private $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function sendText($toPhone, $message)
    {
        if (empty($this->config['enabled'])) {
            return ['ok' => false, 'error' => 'WhatsApp disabled'];
        }

        if (empty($this->config['token']) || empty($this->config['phone_number_id'])) {
            return ['ok' => false, 'error' => 'WhatsApp config missing'];
        }

        $normalized = $this->normalizePhone($toPhone);
        if ($normalized === '') {
            return ['ok' => false, 'error' => 'Invalid phone number'];
        }

        $url = rtrim($this->config['api_url'], '/') . '/' . $this->config['phone_number_id'] . '/messages';

        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $normalized,
            'type' => 'text',
            'text' => [
                'body' => $message,
            ],
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $this->config['token'],
            'Content-Type: application/json',
        ]);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

        $response = curl_exec($ch);
        $error = curl_error($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false) {
            return ['ok' => false, 'error' => $error ?: 'Unknown error'];
        }

        if ($status < 200 || $status >= 300) {
            return ['ok' => false, 'error' => 'WhatsApp API error', 'status' => $status, 'response' => $response];
        }

        return ['ok' => true];
    }

    private function normalizePhone($phone)
    {
        $digits = preg_replace('/\D+/', '', $phone);
        return $digits ?: '';
    }
}
