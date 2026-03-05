<?php
// backend/php/api/braces.php
require_once __DIR__ . '/../config/database.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

// If $path is already defined in index.php, use it. Otherwise calculate it.
if (!isset($path)) {
    $request_uri = $_SERVER['REQUEST_URI'];
    $script_name = dirname($_SERVER['SCRIPT_NAME']);
    $base_path = rtrim($script_name, '/') . '/';
    $path = trim(substr($request_uri, strlen($base_path) - 1), '/');
    $path = explode('?', $path)[0];
}

try {
    if ($method === 'GET' && $path === 'api/braces/positions') {
        $stmt = $db->query("SELECT * FROM braces_positions");
        echo json_encode($stmt->fetchAll());
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
