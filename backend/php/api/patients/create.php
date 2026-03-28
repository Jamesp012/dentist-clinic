<?php
// backend/php/api/patients/create.php

// Enable error reporting for debugging (Remove in production if desired)
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';
require_once __DIR__ . '/../../utils/email_helper.php';

$payload = authorize(); // Ensure user is logged in

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (!$data) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON input"]);
    exit();
}

if (empty($data->name)) {
    http_response_code(400);
    echo json_encode(["error" => "Patient name is required"]);
    exit();
}

// ... existing helpers ...

try {
    $db->beginTransaction();

    // 1. Generate username and temporary password
    $username = generateUsername($db, $data->name, $data->email ?? null);
    $tempPassword = generateRandomPassword();
    $hashedPassword = password_hash($tempPassword, PASSWORD_BCRYPT);

    // 2. Create user account
    $userQuery = "INSERT INTO users (username, password, fullName, email, phone, dateOfBirth, role) 
                  VALUES (:username, :password, :fullName, :email, :phone, :dob, 'patient')";
    $userStmt = $db->prepare($userQuery);
    
    $email = !empty($data->email) ? $data->email : null;
    $phone = !empty($data->phone) ? $data->phone : null;
    $dob = !empty($data->dateOfBirth) ? formatDateForDB($data->dateOfBirth) : null;

    $userStmt->bindValue(':username', $username);
    $userStmt->bindValue(':password', $hashedPassword);
    $userStmt->bindValue(':fullName', $data->name);
    $userStmt->bindValue(':email', $email);
    $userStmt->bindValue(':phone', $phone);
    $userStmt->bindValue(':dob', $dob);
    
    if (!$userStmt->execute()) {
        $errorInfo = $userStmt->errorInfo();
        throw new Exception("Failed to create user account. SQL Error: " . $errorInfo[2] . " (Code: " . $errorInfo[1] . ")");
    }
    $userId = $db->lastInsertId();

    // 3. Create patient record
    $patientQuery = "INSERT INTO patients (user_id, name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies, profilePhoto, has_account) 
                     VALUES (:userId, :name, :dob, :phone, :email, :address, :sex, :medHistory, :allergies, :photo, TRUE)";
    
    $patientStmt = $db->prepare($patientQuery);
    
    $address = !empty($data->address) ? $data->address : null;
    $sex = !empty($data->sex) ? $data->sex : null;
    $medHistory = !empty($data->medicalHistory) ? $data->medicalHistory : '';
    $allergies = !empty($data->allergies) ? $data->allergies : '';
    $photo = !empty($data->profilePhoto) ? $data->profilePhoto : null;

    $patientStmt->bindValue(':userId', $userId);
    $patientStmt->bindValue(':name', $data->name);
    $patientStmt->bindValue(':dob', $dob);
    $patientStmt->bindValue(':phone', $phone);
    $patientStmt->bindValue(':email', $email);
    $patientStmt->bindValue(':address', $address);
    $patientStmt->bindValue(':sex', $sex);
    $patientStmt->bindValue(':medHistory', $medHistory);
    $patientStmt->bindValue(':allergies', $allergies);
    $patientStmt->bindValue(':photo', $photo);
    
    if (!$patientStmt->execute()) {
        $errorInfo = $patientStmt->errorInfo();
        throw new Exception("Failed to create patient record. SQL Error: " . $errorInfo[2] . " (Code: " . $errorInfo[1] . ")");
    }
    $patientId = $db->lastInsertId();

    $db->commit();

    // Send credentials email - do not fail the request if email fails
    if ($email) {
        EmailHelper::sendPatientCredentials($email, $data->name, $username, $tempPassword);
    }

    echo json_encode([
        "id" => (int)$patientId,
        "userId" => (int)$userId,
        "username" => $username,
        "tempPassword" => $tempPassword,
        "name" => $data->name,
        "dateOfBirth" => $dob,
        "phone" => $phone,
        "email" => $email,
        "address" => $address,
        "sex" => $sex,
        "medicalHistory" => $medHistory,
        "allergies" => $allergies,
        "profilePhoto" => $photo,
        "has_account" => true
    ]);

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
