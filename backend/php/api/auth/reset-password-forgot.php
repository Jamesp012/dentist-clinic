<?php
// backend/php/api/auth/reset-password-forgot.php
require_once __DIR__ . '/../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->username) || !isset($data->otp) || !isset($data->newPassword)) {
    http_response_code(400);
    echo json_encode(["error" => "Username, OTP, and new password are required"]);
    exit();
}

try {
    // 1. Get user phone
    $stmt = $db->prepare("SELECT id, phone FROM users WHERE username = ?");
    $stmt->execute([$data->username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(["error" => "User not found"]);
        exit();
    }

    $phone = $user['phone'];

    // 2. Verify OTP (must be verified already or we verify it here)
    // For simplicity, let's verify it again here to ensure security
    $stmt = $db->prepare("SELECT id, expiresAt FROM otp_verifications WHERE phone = ? AND otp = ? AND verified = 1");
    $stmt->execute([$phone, $data->otp]);
    $otpRecord = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$otpRecord) {
        http_response_code(400);
        echo json_encode(["error" => "OTP not verified or invalid"]);
        exit();
    }

    // 3. Update password
    $hashedPassword = password_hash($data->newPassword, PASSWORD_BCRYPT);
    $stmt = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt->execute([$hashedPassword, $user['id']]);

    // 4. Delete the used OTP
    $stmt = $db->prepare("DELETE FROM otp_verifications WHERE id = ?");
    $stmt->execute([$otpRecord['id']]);

    echo json_encode([
        "success" => true,
        "message" => "Password reset successfully"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>