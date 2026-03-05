<?php
// backend/php/api/treatment-records/get_by_patient.php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();

$database = new Database();
$db = $database->getConnection();

$patientId = $_GET['patientId'] ?? null;

if (!$patientId) {
    http_response_code(400);
    echo json_encode(["error" => "No patient ID provided"]);
    exit;
}

try {
    $stmt = $db->prepare("SELECT * FROM treatmentrecords WHERE patientId = ? ORDER BY date DESC, createdAt DESC");
    $stmt->execute([$patientId]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($results as &$r) {
        if ($r['installmentPlan']) $r['installmentPlan'] = json_decode($r['installmentPlan']);
    }
    echo json_encode($results);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
