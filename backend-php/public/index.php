<?php

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Request.php';
require_once __DIR__ . '/../src/Response.php';
require_once __DIR__ . '/../src/Validators.php';
require_once __DIR__ . '/../src/WhatsAppClient.php';
require_once __DIR__ . '/../src/Controllers/AuthController.php';
require_once __DIR__ . '/../src/Controllers/ClientsController.php';
require_once __DIR__ . '/../src/Controllers/ProvidersController.php';
require_once __DIR__ . '/../src/Controllers/AppointmentsController.php';
require_once __DIR__ . '/../src/Controllers/RemindersController.php';

$config = require __DIR__ . '/../config/config.php';
$db = new Database($config['db']);
$pdo = $db->getConnection();

// CORS
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowedOrigins = $config['cors']['allowed_origins'];
if (in_array('*', $allowedOrigins, true) || in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . ($origin ?: '*'));
}
header('Access-Control-Allow-Headers: ' . implode(', ', $config['cors']['allowed_headers']));
header('Access-Control-Allow-Methods: ' . implode(', ', $config['cors']['allowed_methods']));

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Optional API key
if (!empty($config['api']['require_api_key'])) {
    $apiKey = isset($_SERVER['HTTP_X_API_KEY']) ? $_SERVER['HTTP_X_API_KEY'] : '';
    if ($apiKey !== $config['api']['api_key']) {
        Response::error('Unauthorized', 401);
    }
}

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$basePath = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
if ($basePath && $basePath !== '/' && strpos($path, $basePath) === 0) {
    $path = substr($path, strlen($basePath));
}
if ($path === '') {
    $path = '/';
}

$body = Request::json();

$routes = [
    ['POST', '#^/api/auth/register$#', function () use ($pdo, $body) {
        AuthController::register($pdo, $body);
    }],
    ['POST', '#^/api/auth/login$#', function () use ($pdo, $body) {
        AuthController::login($pdo, $body);
    }],
    ['GET', '#^/api/clients/(\d+)$#', function ($id) use ($pdo) {
        ClientsController::get($pdo, (int) $id);
    }],
    ['GET', '#^/api/providers$#', function () use ($pdo) {
        ProvidersController::list($pdo);
    }],
    ['GET', '#^/api/providers/(\d+)$#', function ($id) use ($pdo) {
        ProvidersController::get($pdo, (int) $id);
    }],
    ['GET', '#^/api/providers/(\d+)/availability$#', function ($id) use ($pdo) {
        ProvidersController::getAvailability($pdo, (int) $id);
    }],
    ['POST', '#^/api/providers/(\d+)/availability$#', function ($id) use ($pdo, $body) {
        ProvidersController::setAvailability($pdo, (int) $id, $body);
    }],
    ['GET', '#^/api/appointments$#', function () use ($pdo) {
        AppointmentsController::list($pdo);
    }],
    ['GET', '#^/api/appointments/(\d+)$#', function ($id) use ($pdo) {
        AppointmentsController::get($pdo, (int) $id);
    }],
    ['POST', '#^/api/appointments$#', function () use ($pdo, $body) {
        AppointmentsController::create($pdo, $body);
    }],
    ['PUT', '#^/api/appointments/(\d+)$#', function ($id) use ($pdo, $body) {
        AppointmentsController::update($pdo, (int) $id, $body);
    }],
    ['DELETE', '#^/api/appointments/(\d+)$#', function ($id) use ($pdo) {
        AppointmentsController::delete($pdo, (int) $id);
    }],
    ['GET', '#^/api/availability$#', function () use ($pdo) {
        AppointmentsController::availableSlots($pdo);
    }],
    ['POST', '#^/api/reminders/run$#', function () use ($pdo, $config) {
        RemindersController::run($pdo, $config['whatsapp']);
    }],
    ['GET', '#^/api/reminders/run$#', function () use ($pdo, $config) {
        RemindersController::run($pdo, $config['whatsapp']);
    }],
    ['GET', '#^/api/health$#', function () {
        Response::json(['status' => 'ok']);
    }],
];

foreach ($routes as $route) {
    [$routeMethod, $pattern, $handler] = $route;
    if ($method === $routeMethod && preg_match($pattern, $path, $matches)) {
        array_shift($matches);
        $handler(...$matches);
        exit;
    }
}

Response::error('Not found', 404);
