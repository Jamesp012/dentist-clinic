<?php
// backend/php/api/appointments/delete.php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();

$database = new Database();
$db = $database->getConnection();

$request_uri = $_SERVER['REQUEST_URI'];
$parts = explode('/', trim($request_uri, '/'));
$appointmentId = end($parts);

if (!is_numeric($appointmentId)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid appointment ID"]);
    exit();
}

try {
    $query = "DELETE FROM appointments WHERE id = ?";
    $stmt = $db->prepare($query);
    $stmt->execute([$appointmentId]);
    echo json_encode(["message" => "Appointment deleted"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
