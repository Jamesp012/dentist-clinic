<?php
// backend/php/api/treatment-records/update.php
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
    $data = json_decode(file_get_contents("php://input"));
    
    if (!$data) {
        throw new Exception("Invalid input data");
    }

    $query = "UPDATE treatmentrecords SET 
                date = :date, treatment = :treatment, tooth = :tooth, 
                notes = :notes, cost = :cost, dentist = :dentist, 
                paymentType = :paymentType, amountPaid = :amountPaid, 
                remainingBalance = :remainingBalance, installmentPlan = :installmentPlan 
              WHERE id = :id";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':date', $data->date ?? null);
    $stmt->bindValue(':treatment', $data->treatment ?? null);
    $stmt->bindValue(':tooth', $data->tooth ?? null);
    $stmt->bindValue(':notes', $data->notes ?? null);
    $stmt->bindValue(':cost', $data->cost ?? 0);
    $stmt->bindValue(':dentist', $data->dentist ?? null);
    $stmt->bindValue(':paymentType', $data->paymentType ?? 'full');
    $stmt->bindValue(':amountPaid', $data->amountPaid ?? 0);
    $stmt->bindValue(':remainingBalance', $data->remainingBalance ?? 0);
    $stmt->bindValue(':installmentPlan', isset($data->installmentPlan) ? json_encode($data->installmentPlan) : null);
    $stmt->bindValue(':id', $id);
    
    if ($stmt->execute()) {
        echo json_encode(["success" => true]);
    } else {
        $errorInfo = $stmt->errorInfo();
        throw new Exception("Failed to update treatment record: " . $errorInfo[2]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
