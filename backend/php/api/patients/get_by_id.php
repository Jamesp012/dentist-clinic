<?php
// backend/php/api/patients/get_by_id.php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();

$database = new Database();
$db = $database->getConnection();

try {
    $stmt = $db->prepare("SELECT * FROM patients WHERE id = ?");
    $stmt->execute([$id]);
    $patient = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$patient) {
        http_response_code(404);
        echo json_encode(["error" => "Patient not found"]);
        exit();
    }
    
    // Convert numeric strings to numbers if needed
    $patient['id'] = (int)$patient['id'];
    $patient['user_id'] = $patient['user_id'] ? (int)$patient['user_id'] : null;
    $patient['totalBalance'] = (float)$patient['totalBalance'];
    $patient['has_account'] = (bool)$patient['has_account'];

    echo json_encode($patient);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
