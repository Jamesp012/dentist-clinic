<?php
// backend/php/api/patients/update.php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (!$data) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON input"]);
    exit();
}

try {
    $db->beginTransaction();

    $dob = !empty($data->dateOfBirth) ? formatDateForDB($data->dateOfBirth) : null;

    $query = "UPDATE patients SET 
                name = :name, 
                dateOfBirth = :dob, 
                phone = :phone, 
                email = :email, 
                address = :address, 
                sex = :sex, 
                medicalHistory = :medHistory, 
                allergies = :allergies";
    
    $params = [
        ':name' => $data->name,
        ':dob' => $dob,
        ':phone' => $data->phone ?? null,
        ':email' => $data->email ?? null,
        ':address' => $data->address ?? null,
        ':sex' => $data->sex ?? null,
        ':medHistory' => $data->medicalHistory ?? '',
        ':allergies' => $data->allergies ?? '',
        ':id' => $id
    ];

    if (!empty($data->profilePhoto)) {
        $query .= ", profilePhoto = :photo";
        $params[':photo'] = $data->profilePhoto;
    }

    $query .= " WHERE id = :id";
    
    $stmt = $db->prepare($query);
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to update patient");
    }

    // Also update associated user if exists
    $userStmt = $db->prepare("SELECT user_id FROM patients WHERE id = ?");
    $userStmt->execute([$id]);
    $patient = $userStmt->fetch();
    
    if ($patient && $patient['user_id']) {
        $updateUserStmt = $db->prepare("UPDATE users SET fullName = ?, email = ?, phone = ?, dateOfBirth = ? WHERE id = ?");
        $updateUserStmt->execute([
            $data->name,
            $data->email ?? null,
            $data->phone ?? null,
            $dob,
            $patient['user_id']
        ]);
    }

    $db->commit();
    echo json_encode(["success" => true, "message" => "Patient updated successfully"]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
