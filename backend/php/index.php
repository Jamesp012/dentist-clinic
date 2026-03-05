<?php
// backend/php/index.php
require_once __DIR__ . '/config/config.php';

$request = $_SERVER['REQUEST_URI'];
$script_name = dirname($_SERVER['SCRIPT_NAME']);
$base_path = rtrim($script_name, '/') . '/';

$path = substr($request, strlen($base_path) - 1);
$path = explode('?', $path)[0]; // Remove query string
$path = trim($path, "/ \t\n\r\0\x0B");

$method = $_SERVER['REQUEST_METHOD'];

// Debug routing
// error_log("Request URI: " . $_SERVER['REQUEST_URI']);
// error_log("Base Path: " . $base_path);
// error_log("Calculated Path: " . $path);
// error_log("Method: " . $method);

function matches($pattern, $path) {
    return preg_match("#^" . $pattern . "$#", $path, $matches) ? $matches : false;
}

try {
    // Exact routes
    $exact_routes = [
        'api/health' => ['GET' => 'api/health.php'],
        'api/auth/login' => ['POST' => 'api/auth/login.php'],
        'api/auth/register' => ['POST' => 'api/auth/register.php'],
        'api/auth/change-password' => ['POST' => 'api/auth/change-password.php'],
        'api/auth/check-username' => ['GET' => 'api/auth/check-username.php'],
        'api/auth/send-password-otp' => ['POST' => 'api/auth/send-password-otp.php'],
        'api/auth/verify-password-otp' => ['POST' => 'api/auth/verify-password-otp.php'],
        'api/auth/update-settings' => ['PUT' => 'api/auth/update-settings.php'],
        'api/patients' => [
            'GET' => 'api/patients/get_all.php',
            'POST' => 'api/patients/create.php'
        ],
        'api/appointments' => [
            'GET' => 'api/appointments/get_all.php',
            'POST' => 'api/appointments/create.php'
        ],
        'api/inventory' => [
            'GET' => 'api/inventory/get_all.php',
            'POST' => 'api/inventory/create.php'
        ],
        'api/inventory/history' => ['GET' => 'api/inventory/history.php'],
        'api/treatment-records' => [
            'GET' => 'api/treatment-records/get_all.php',
            'POST' => 'api/treatment-records/create.php'
        ],
        'api/payments' => [
            'GET' => 'api/payments.php',
            'POST' => 'api/payments.php'
        ],
        'api/announcements' => [
            'GET' => 'api/announcements/get_all.php',
            'POST' => 'api/announcements.php'
        ],
        'api/referrals' => [
            'GET' => 'api/referrals/get_all.php',
            'POST' => 'api/referrals/create.php'
        ],
        'api/referrals/upload' => ['POST' => 'api/referrals/upload.php'],
        'api/employees' => ['GET' => 'api/employees.php', 'POST' => 'api/employees.php'],
        'api/photos' => ['GET' => 'api/photos.php', 'POST' => 'api/photos.php'],
        'api/notifications' => ['GET' => 'api/notifications.php', 'POST' => 'api/notifications.php'],
        'api/notifications/read-all' => ['PUT' => 'api/notifications.php'],
        'api/notifications/unread/count' => ['GET' => 'api/notifications.php'],
        'api/prescriptions' => ['GET' => 'api/prescriptions.php', 'POST' => 'api/prescriptions.php'],
        'api/braces/positions' => ['GET' => 'api/braces.php'],
        'api/dental-charts' => [
            'GET' => 'api/dental_charts.php',
            'POST' => 'api/dental_charts.php',
            'DELETE' => 'api/dental_charts.php'
        ],
        'api/braces-charts' => [
            'GET' => 'api/braces_charts.php',
            'POST' => 'api/braces_charts.php',
            'DELETE' => 'api/braces_charts.php'
        ],
        'api/services' => [
            'GET' => 'api/services.php',
            'POST' => 'api/services.php',
            'PUT' => 'api/services.php',
            'DELETE' => 'api/services.php'
        ],
        'api/services/' => [
            'GET' => 'api/services.php',
            'POST' => 'api/services.php',
            'PUT' => 'api/services.php',
            'DELETE' => 'api/services.php'
        ],
        'api/migrate-services' => ['GET' => 'migrate-services.php'],
        'api/migrate-referrals' => ['GET' => 'migrate-referrals-fixed.php'],
    ];

    if (isset($exact_routes[$path][$method])) {
        require_once __DIR__ . '/' . $exact_routes[$path][$method];
        exit();
    }

    // Pattern routes
    if ($m = matches('api/services/(\d+)', $path)) {
        require_once __DIR__ . '/api/services.php';
        exit();
    }

    if (strpos($path, 'api/services') === 0) {
        require_once __DIR__ . '/api/services.php';
        exit();
    }

    // Try case-insensitive and with/without slash
    $path_lower = strtolower($path);
    $path_no_api = preg_replace('/^api\//', '', $path_lower);
    
    foreach ($exact_routes as $route_path => $methods) {
        $route_path_lower = strtolower($route_path);
        $route_path_no_api = preg_replace('/^api\//', '', $route_path_lower);
        
        if (trim($route_path_no_api, "/ \t\n\r\0\x0B") === trim($path_no_api, "/ \t\n\r\0\x0B")) {
            if (isset($methods[$method])) {
                require_once __DIR__ . '/' . $methods[$method];
                exit();
            }
        }
    }

    // Pattern routes
    if ($m = matches('api/patients/(\d+)', $path)) {
        $id = $m[1];
        if ($method === 'GET') require_once __DIR__ . '/api/patients/get_by_id.php';
        if ($method === 'PUT') require_once __DIR__ . '/api/patients/update.php';
        if ($method === 'DELETE') require_once __DIR__ . '/api/patients/delete.php';
        exit();
    }

    if ($m = matches('api/appointments/(\d+)', $path)) {
        if ($method === 'PUT') require_once __DIR__ . '/api/appointments/update.php';
        if ($method === 'DELETE') require_once __DIR__ . '/api/appointments/delete.php';
        exit();
    }

    if ($m = matches('api/inventory/(\d+)', $path)) {
        if ($method === 'PUT') require_once __DIR__ . '/api/inventory/update.php';
        if ($method === 'DELETE') require_once __DIR__ . '/api/inventory/delete.php';
        exit();
    }

    if ($m = matches('api/inventory/(\d+)/update-stock', $path)) {
        if ($method === 'POST') require_once __DIR__ . '/api/inventory/update_stock.php';
        exit();
    }

    if ($m = matches('api/inventory/(\d+)/history', $path)) {
        if ($method === 'GET') require_once __DIR__ . '/api/inventory/history.php';
        exit();
    }

    if ($m = matches('api/employees/.*', $path)) {
        require_once __DIR__ . '/api/employees.php';
        exit();
    }

    if ($m = matches('api/photos/.*', $path)) {
        require_once __DIR__ . '/api/photos.php';
        exit();
    }

    if ($m = matches('api/notifications/.*', $path)) {
        require_once __DIR__ . '/api/notifications.php';
        exit();
    }

    if ($m = matches('api/referrals/(\d+)', $path)) {
        $_GET['id'] = $m[1];
        if ($method === 'GET') require_once __DIR__ . '/api/referrals/get_by_id.php';
        if ($method === 'PUT') require_once __DIR__ . '/api/referrals/update.php';
        if ($method === 'DELETE' || ($method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'delete')) require_once __DIR__ . '/api/referrals/delete.php';
        exit();
    }

    if ($m = matches('api/referrals/patient/(\d+)', $path)) {
        $_GET['patientId'] = $m[1];
        if ($method === 'GET') require_once __DIR__ . '/api/referrals/get_by_patient.php';
        exit();
    }

    if ($m = matches('api/prescriptions/.*', $path)) {
        require_once __DIR__ . '/api/prescriptions.php';
        exit();
    }

    if ($m = matches('api/patient-claiming/.*', $path)) {
        require_once __DIR__ . '/api/patient-claiming.php';
        exit();
    }

    if ($m = matches('api/treatment-records/(\d+)', $path)) {
        $_GET['id'] = $m[1];
        if ($method === 'GET') require_once __DIR__ . '/api/treatment-records/get_by_id.php';
        if ($method === 'PUT') require_once __DIR__ . '/api/treatment-records/update.php';
        if ($method === 'DELETE') require_once __DIR__ . '/api/treatment-records/delete.php';
        exit();
    }

    if ($m = matches('api/treatment-records/patient/(\d+)', $path)) {
        $_GET['patientId'] = $m[1];
        if ($method === 'GET') require_once __DIR__ . '/api/treatment-records/get_by_patient.php';
        exit();
    }

    if ($m = matches('api/payments/.*', $path)) {
        require_once __DIR__ . '/api/payments.php';
        exit();
    }

    if ($m = matches('api/announcements/.*', $path)) {
        require_once __DIR__ . '/api/announcements.php';
        exit();
    }

    if ($m = matches('api/inventory-management/.*', $path)) {
        require_once __DIR__ . '/api/inventory-management.php';
        exit();
    }

    if ($m = matches('api/services/.*', $path)) {
        require_once __DIR__ . '/api/services.php';
        exit();
    }

    if ($path === 'api/services' || $path === 'api/services/') {
        require_once __DIR__ . '/api/services.php';
        exit();
    }

    // Default 404
    http_response_code(404);
    echo json_encode([
        "error" => "Endpoint not found: $path",
        "method" => $method,
        "debug" => [
            "request" => $_SERVER['REQUEST_URI'],
            "base" => $base_path,
            "path" => $path
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
