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
 * Helper to format date from various formats to YYYY-MM-DD for MySQL
 */
function formatDateForDB($dateStr) {
    if (empty($dateStr) || $dateStr === '0000-00-00' || $dateStr === '00/00/0000') return null;
    
    // Trim any whitespace
    $dateStr = trim($dateStr);
    
    // If it's already YYYY-MM-DD, return as is
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateStr)) {
        return $dateStr;
    }

    // Handle ISO format (2026-03-31T16:00:00.000Z)
    if (strpos($dateStr, 'T') !== false) {
        $parts = explode('T', $dateStr);
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $parts[0])) {
            return $parts[0];
        }
    }
    
    // Handle separators (slash or dash)
    $separator = false;
    if (strpos($dateStr, '/') !== false) $separator = '/';
    elseif (strpos($dateStr, '-') !== false) $separator = '-';
    
    if ($separator) {
        $parts = explode($separator, $dateStr);
        if (count($parts) === 3) {
            // Check if year is first (YYYY-MM-DD)
            if (strlen($parts[0]) === 4) {
                return $parts[0] . '-' . str_pad($parts[1], 2, '0', STR_PAD_LEFT) . '-' . str_pad($parts[2], 2, '0', STR_PAD_LEFT);
            }
            
            // Check if year is last (MM/DD/YYYY or DD/MM/YYYY)
            if (strlen($parts[2]) === 4) {
                $p0 = intval($parts[0]);
                $p1 = intval($parts[1]);
                $year = $parts[2];
                
                // If first part is > 12, it must be day (DD/MM/YYYY)
                if ($p0 > 12) {
                    return $year . '-' . str_pad($parts[1], 2, '0', STR_PAD_LEFT) . '-' . str_pad($parts[0], 2, '0', STR_PAD_LEFT);
                }
                // If middle part is > 12, it must be day (MM/DD/YYYY)
                if ($p1 > 12) {
                    return $year . '-' . str_pad($parts[0], 2, '0', STR_PAD_LEFT) . '-' . str_pad($parts[1], 2, '0', STR_PAD_LEFT);
                }
                
                // For ambiguous dates like 01/02/1990:
                // User explicitly said they use MM/DD/YYYY
                return $year . '-' . str_pad($parts[0], 2, '0', STR_PAD_LEFT) . '-' . str_pad($parts[1], 2, '0', STR_PAD_LEFT);
            }
        }
    }
    
    // Fallback attempt with strtotime
    $time = strtotime($dateStr);
    if ($time !== false) {
        // If strtotime worked, check if it interpreted it correctly
        // strtotime prefers MM/DD/YYYY for / and YYYY-MM-DD for -
        return date('Y-m-d', $time);
    }
    
    // If all else fails, return null to avoid 0000-00-00 in MySQL
    return null;
}

/**
 * Helper to format datetime for MySQL (YYYY-MM-DD HH:MM:SS)
 */
function formatDateTimeForDB($dateTimeStr) {
    if (empty($dateTimeStr)) return null;
    
    $dateTimeStr = trim($dateTimeStr);
    
    // If it's already YYYY-MM-DD HH:MM:SS, return as is
    if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $dateTimeStr)) {
        return $dateTimeStr;
    }
    
    // Attempt to parse with strtotime
    $time = strtotime($dateTimeStr);
    if ($time !== false) {
        return date('Y-m-d H:i:s', $time);
    }
    
    return null;
}
?>
