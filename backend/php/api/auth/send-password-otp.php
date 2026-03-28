<?php
// backend/php/api/auth/send-password-otp.php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/sms_helper.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->username)) {
    http_response_code(400);
    echo json_encode(["error" => "username is required"]);
    exit();
}

try {
    // Get user phone
    $stmt = $db->prepare("SELECT phone FROM users WHERE username = ?");
    $stmt->execute([$data->username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(["error" => "User not found"]);
        exit();
    }

    $phone = $user['phone'];
    if (!$phone) {
        http_response_code(400);
        echo json_encode(["error" => "No phone number associated with this account"]);
        exit();
    }

    $otp = (string)rand(100000, 999999);
    $expiresAt = date('Y-m-d H:i:s', strtotime('+10 minutes'));

    // Clear old OTPs for this phone
    $stmt = $db->prepare("DELETE FROM otp_verifications WHERE phone = ?");
    $stmt->execute([$phone]);

    // Insert new OTP
    $stmt = $db->prepare("INSERT INTO otp_verifications (phone, otp, expiresAt, verified) VALUES (?, ?, ?, 0)");
    $stmt->execute([$phone, $otp, $expiresAt]);

    // Mask phone for response
    $maskedPhone = preg_replace('/(\d{3})\d+(\d{4})/', '$1****$2', $phone);

    // Call SMS helper
    $smsResult = sendSMS($phone, "Your verification code for password change is: $otp. Valid for 10 minutes.");

    if ($smsResult['success']) {
        $msg = isset($smsResult['simulated']) && $smsResult['simulated'] 
            ? "OTP simulation: $otp (Check logs)" 
            : "OTP sent successfully";
        
        echo json_encode([
            "success" => true,
            "message" => $msg,
            "phone" => $maskedPhone,
            "otp_debug" => $otp // For development only
        ]);
    } else {
        error_log("OTP send failed for $phone: " . json_encode($smsResult));
        http_response_code(500);
        echo json_encode(["error" => "Failed to send OTP via SMS. Please contact support.", "details" => $smsResult['error'] ?? 'Unknown error']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
