<?php
// backend/php/api/inventory/delete.php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();
$database = new Database();
$db = $database->getConnection();

$request_uri = $_SERVER['REQUEST_URI'];
$parts = explode('/', trim($request_uri, '/'));
$id = end($parts);

if (!is_numeric($id)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid ID"]);
    exit();
}

try {
    $stmt = $db->prepare("DELETE FROM inventory WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(["message" => "Item deleted"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
