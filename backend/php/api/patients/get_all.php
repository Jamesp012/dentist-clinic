<?php
// backend/php/api/patients/get_all.php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();

$database = new Database();
$db = $database->getConnection();

try {
    // Optimization: Don't fetch profilePhoto in the list view
    $query = "SELECT id, name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies, lastVisit, nextAppointment, totalBalance, has_account, createdAt 
              FROM patients 
              ORDER BY name ASC";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $patients = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($patients);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
