<?php
// backend/php/api/patients/delete.php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();

// Only allow doctor or assistant to delete patients
if ($payload['role'] !== 'doctor' && $payload['role'] !== 'assistant') {
    http_response_code(403);
    echo json_encode(["error" => "Unauthorized to delete patients"]);
    exit();
}

$database = new Database();
$db = $database->getConnection();

// Get patient ID from URL
// In our router, this is handled by index.php, but for now we'll handle it via query param or path
$request_uri = $_SERVER['REQUEST_URI'];
$parts = explode('/', trim($request_uri, '/'));
$patientId = end($parts);

if (!is_numeric($patientId)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid patient ID"]);
    exit();
}

try {
    $db->beginTransaction();

    // 1. Get user_id before deleting patient
    $query = "SELECT user_id FROM patients WHERE id = :id LIMIT 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $patientId);
    $stmt->execute();
    $patient = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$patient) {
        $db->rollBack();
        http_response_code(404);
        echo json_encode(["error" => "Patient not found"]);
        exit();
    }

    $userId = $patient['user_id'];

    // 2. Delete patient record
    $deletePatient = "DELETE FROM patients WHERE id = :id";
    $stmt = $db->prepare($deletePatient);
    $stmt->bindParam(':id', $patientId);
    $stmt->execute();

    // 3. Delete associated user account if it exists
    if ($userId) {
        $deleteUser = "DELETE FROM users WHERE id = :id";
        $stmt = $db->prepare($deleteUser);
        $stmt->bindParam(':id', $userId);
        $stmt->execute();
    }

    $db->commit();
    echo json_encode(["message" => "Patient deleted successfully"]);

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
