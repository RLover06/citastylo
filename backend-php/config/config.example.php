<?php

return [
    'db' => [
        'host' => '127.0.0.1',
        'name' => 'stylo',
        'user' => 'root',
        'pass' => '',
        'charset' => 'utf8mb4',
    ],
    'cors' => [
        'allowed_origins' => [
            'http://localhost:3001',
            'http://localhost',
        ],
        'allowed_headers' => [
            'Content-Type',
            'Authorization',
            'X-API-Key',
        ],
        'allowed_methods' => [
            'GET',
            'POST',
            'PUT',
            'DELETE',
            'OPTIONS',
        ],
    ],
    'api' => [
        'require_api_key' => false,
        'api_key' => 'change-me',
    ],
];
