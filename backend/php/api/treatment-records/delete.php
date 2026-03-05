<?php
// backend/php/api/treatment-records/delete.php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();

$database = new Database();
$db = $database->getConnection();

$id = $_GET['id'] ?? null;

if (!$id) {
    http_response_code(400);
    echo json_encode(["error" => "No ID provided"]);
    exit;
}

try {
    $stmt = $db->prepare("DELETE FROM treatmentrecords WHERE id = ?");
    if ($stmt->execute([$id])) {
        echo json_encode(["success" => true]);
    } else {
        $errorInfo = $stmt->errorInfo();
        throw new Exception("Failed to delete treatment record: " . $errorInfo[2]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
