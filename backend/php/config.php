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

/**
 * Helper to format date from DD/MM/YYYY to YYYY-MM-DD for MySQL
 */
function formatDateForDB($dateStr) {
    if (empty($dateStr)) return null;
    
    // If it's already YYYY-MM-DD, return as is
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateStr)) {
        return $dateStr;
    }
    
    // Handle DD/MM/YYYY
    if (strpos($dateStr, '/') !== false) {
        $parts = explode('/', $dateStr);
        if (count($parts) === 3) {
            // Check if year is first or last
            if (strlen($parts[0]) === 4) {
                // YYYY/MM/DD
                return $parts[0] . '-' . str_pad($parts[1], 2, '0', STR_PAD_LEFT) . '-' . str_pad($parts[2], 2, '0', STR_PAD_LEFT);
            } else {
                // DD/MM/YYYY
                return $parts[2] . '-' . str_pad($parts[1], 2, '0', STR_PAD_LEFT) . '-' . str_pad($parts[0], 2, '0', STR_PAD_LEFT);
            }
        }
    }
    
    // Fallback attempt with strtotime
    $time = strtotime($dateStr);
    return $time ? date('Y-m-d', $time) : $dateStr;
}
?>
