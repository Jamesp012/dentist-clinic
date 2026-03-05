<?php
// backend/php/api/auth/check-username.php
require_once __DIR__ . '/../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$username = isset($_GET['username']) ? $_GET['username'] : '';

if (empty($username)) {
    echo json_encode(["available" => false, "error" => "Username is required"]);
    exit();
}

try {
    $stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    echo json_encode(["available" => !$user]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
