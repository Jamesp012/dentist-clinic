<?php
// backend/php/api/treatment-records/create.php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();

$database = new Database();
$db = $database->getConnection();

try {
    $data = json_decode(file_get_contents("php://input"));
    
    if (!$data) {
        throw new Exception("Invalid input data");
    }

    $query = "INSERT INTO treatmentrecords (
                patientId, date, treatment, tooth, notes, 
                cost, dentist, paymentType, amountPaid, 
                remainingBalance, installmentPlan
            ) VALUES (
                :patientId, :date, :treatment, :tooth, :notes, 
                :cost, :dentist, :paymentType, :amountPaid, 
                :remainingBalance, :installmentPlan
            )";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':patientId', (!empty($data->patientId)) ? $data->patientId : null);
    $stmt->bindValue(':date', $data->date ?? date('Y-m-d'));
    $stmt->bindValue(':treatment', $data->treatment ?? null);
    $stmt->bindValue(':tooth', $data->tooth ?? null);
    $stmt->bindValue(':notes', $data->notes ?? null);
    $stmt->bindValue(':cost', $data->cost ?? 0);
    $stmt->bindValue(':dentist', $data->dentist ?? null);
    $stmt->bindValue(':paymentType', $data->paymentType ?? 'full');
    $stmt->bindValue(':amountPaid', $data->amountPaid ?? 0);
    $stmt->bindValue(':remainingBalance', $data->remainingBalance ?? 0);
    $stmt->bindValue(':installmentPlan', isset($data->installmentPlan) ? json_encode($data->installmentPlan) : null);
    
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "id" => $db->lastInsertId()]);
    } else {
        $errorInfo = $stmt->errorInfo();
        throw new Exception("Failed to create treatment record: " . $errorInfo[2]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
