<?php
// backend/php/api/auth/login.php
require_once dirname(dirname(dirname(__DIR__))) . '/php/config/database.php';
require_once dirname(dirname(dirname(__DIR__))) . '/php/utils/jwt_helper.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (empty($data->username) || empty($data->password)) {
    http_response_code(400);
    echo json_encode(["error" => "Username and password required"]);
    exit();
}

try {
    $query = "SELECT * FROM users WHERE username = :username LIMIT 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':username', $data->username);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($data->password, $user['password'])) {
        http_response_code(401);
        echo json_encode(["error" => "Invalid credentials"]);
        exit();
    }

    // Patient ID lookup
    $patientId = null;
    $patientQuery = "SELECT id FROM patients WHERE user_id = :userId LIMIT 1";
    $patientStmt = $db->prepare($patientQuery);
    $patientStmt->bindParam(':userId', $user['id']);
    $patientStmt->execute();
    $patient = $patientStmt->fetch(PDO::FETCH_ASSOC);
    if ($patient) {
        $patientId = $patient['id'];
    }

    $payload = [
        "id" => $user['id'],
        "username" => $user['username'],
        "role" => $user['role'],
        "fullName" => $user['fullName'],
        "email" => $user['email'],
        "dateOfBirth" => $user['dateOfBirth'],
        "patientId" => $patientId,
        "accessLevel" => $user['accessLevel']
    ];

    $token = JWTHelper::generate($payload);

    echo json_encode([
        "token" => $token,
        "user" => [
            "id" => $user['id'],
            "username" => $user['username'],
            "role" => $user['role'],
            "fullName" => $user['fullName'],
            "email" => $user['email'],
            "dateOfBirth" => $user['dateOfBirth'],
            "accessLevel" => $user['accessLevel'],
            "isFirstLogin" => (bool)$user['isFirstLogin'],
            "patientId" => $patientId
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
