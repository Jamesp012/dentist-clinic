<?php
// backend/php/api/auth/verify-password-otp.php
require_once __DIR__ . '/../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->userId) || !isset($data->otp)) {
    http_response_code(400);
    echo json_encode(["error" => "userId and otp are required"]);
    exit();
}

try {
    // Get user phone
    $stmt = $db->prepare("SELECT phone FROM users WHERE id = ?");
    $stmt->execute([$data->userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(["error" => "User not found"]);
        exit();
    }

    $phone = $user['phone'];

    // Check OTP
    $stmt = $db->prepare("SELECT id, expiresAt FROM otp_verifications WHERE phone = ? AND otp = ? AND verified = 0");
    $stmt->execute([$phone, $data->otp]);
    $otpRecord = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$otpRecord) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid or already used OTP"]);
        exit();
    }

    if (new DateTime() > new DateTime($otpRecord['expiresAt'])) {
        http_response_code(400);
        echo json_encode(["error" => "OTP has expired"]);
        exit();
    }

    // Mark as verified
    $stmt = $db->prepare("UPDATE otp_verifications SET verified = 1 WHERE id = ?");
    $stmt->execute([$otpRecord['id']]);

    echo json_encode([
        "success" => true,
        "message" => "OTP verified successfully"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
