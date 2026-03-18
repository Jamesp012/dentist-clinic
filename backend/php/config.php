<?php
// backend/php/config/config.php

// Define base path
define('BASE_PATH', dirname(__DIR__));

// Set timezone to Philippines
date_default_timezone_set('Asia/Manila');

// Load .env file (simple implementation)
function loadEnv($path) {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
        putenv("$name=$value");
    }
}

// Try different possible locations for .env
$envPaths = [
    // Check for .env.production first in common locations
    dirname(dirname(dirname(__DIR__))) . '/backend/.env.production',
    dirname(dirname(dirname(__DIR__))) . '/.env.production',
    __DIR__ . '/../../.env.production',
    dirname(BASE_PATH) . '/.env.production',
    
    // Fallback to regular .env
    dirname(dirname(dirname(__DIR__))) . '/backend/.env',
    dirname(dirname(dirname(__DIR__))) . '/.env',
    __DIR__ . '/../../.env',
    dirname(BASE_PATH) . '/.env'
];

foreach ($envPaths as $path) {
    if (file_exists($path)) {
        loadEnv($path);
        break;
    }
}

// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>
