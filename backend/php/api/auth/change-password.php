<?php
// backend/php/api/auth/change-password.php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/jwt_helper.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"));
        $hashed = password_hash($data->newPassword, PASSWORD_BCRYPT);
        
        $stmt = $db->prepare("UPDATE users SET password = ?, isFirstLogin = 0 WHERE id = ?");
        $stmt->execute([$hashed, $data->userId]);
        
        echo json_encode(["success" => true]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
