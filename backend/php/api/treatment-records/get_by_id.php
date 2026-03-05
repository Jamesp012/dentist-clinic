<?php
// backend/php/api/treatment-records/get_by_id.php
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
    $stmt = $db->prepare("SELECT * FROM treatmentrecords WHERE id = ?");
    $stmt->execute([$id]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($record && $record['installmentPlan']) {
        $record['installmentPlan'] = json_decode($record['installmentPlan']);
    }
    echo json_encode($record);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
