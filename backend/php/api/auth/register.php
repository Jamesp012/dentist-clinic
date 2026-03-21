<?php
// backend/php/api/auth/register.php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/email_helper.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (empty($data->username) || empty($data->password) || empty($data->fullName) || empty($data->role)) {
    http_response_code(400);
    echo json_encode(["error" => "Required fields missing"]);
    exit();
}

try {
    $db->beginTransaction();

    // Check username
    $query = "SELECT id FROM users WHERE username = :username LIMIT 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':username', $data->username);
    $stmt->execute();
    if ($stmt->rowCount() > 0) {
        $db->rollBack();
        http_response_code(400);
        echo json_encode(["error" => "Username already exists"]);
        exit();
    }

    $hashedPassword = password_hash($data->password, PASSWORD_BCRYPT);
    $accessLevel = 'Default Accounts';

    $query = "INSERT INTO users (username, password, fullName, email, role, phone, dateOfBirth, isFirstLogin, accessLevel) 
              VALUES (:username, :password, :fullName, :email, :role, :phone, :dateOfBirth, FALSE, :accessLevel)";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':username', $data->username);
    $stmt->bindParam(':password', $hashedPassword);
    $stmt->bindParam(':fullName', $data->fullName);
    $stmt->bindParam(':email', $data->email);
    $stmt->bindParam(':role', $data->role);
    $stmt->bindParam(':phone', $data->phone);
    $stmt->bindParam(':dateOfBirth', $data->dateOfBirth);
    $stmt->bindParam(':accessLevel', $accessLevel);
    $stmt->execute();
    $userId = $db->lastInsertId();

    if ($data->role === 'patient') {
        $query = "INSERT INTO patients (user_id, name, dateOfBirth, phone, email, sex, address, has_account) 
                  VALUES (:userId, :name, :dob, :phone, :email, :sex, :address, TRUE)";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':userId', $userId);
        $stmt->bindParam(':name', $data->fullName);
        $stmt->bindParam(':dob', $data->dateOfBirth);
        $stmt->bindParam(':phone', $data->phone);
        $stmt->bindParam(':email', $data->email);
        $stmt->bindParam(':sex', $data->sex);
        $stmt->bindParam(':address', $data->address);
        $stmt->execute();
    }

    $db->commit();

    // Send credentials email - do not fail the registration if email fails
    if (!empty($data->email) && $data->role === 'patient') {
        EmailHelper::sendPatientCredentials($data->email, $data->fullName, $data->username, $data->password);
    }

    echo json_encode(["message" => "User registered successfully"]);
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
