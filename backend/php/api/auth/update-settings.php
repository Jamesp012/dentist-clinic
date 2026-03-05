<?php
// backend/php/api/auth/update-settings.php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/jwt_helper.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->userId)) {
    http_response_code(400);
    echo json_encode(["error" => "userId is required"]);
    exit();
}

try {
    // Get current user
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$data->userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(["error" => "User not found"]);
        exit();
    }

    // If password change is requested, verify current password and OTP
    if (isset($data->newPassword) && !empty($data->newPassword)) {
        if (!isset($data->currentPassword)) {
            http_response_code(400);
            echo json_encode(["error" => "Current password is required to change password"]);
            exit();
        }

        if (!password_verify($data->currentPassword, $user['password'])) {
            http_response_code(401);
            echo json_encode(["error" => "Current password is incorrect"]);
            exit();
        }

        // Verify OTP was verified in previous step
        if (!isset($data->otp)) {
            http_response_code(400);
            echo json_encode(["error" => "OTP verification is required for password change"]);
            exit();
        }

        $stmt = $db->prepare("SELECT id FROM otp_verifications WHERE phone = ? AND otp = ? AND verified = 1");
        $stmt->execute([$user['phone'], $data->otp]);
        $verifiedOtp = $stmt->fetch();

        if (!$verifiedOtp) {
            http_response_code(400);
            echo json_encode(["error" => "OTP has not been verified"]);
            exit();
        }
    }

    // If username is being changed, check availability
    if (isset($data->username) && $data->username !== $user['username']) {
        $stmt = $db->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
        $stmt->execute([$data->username, $data->userId]);
        $existingUser = $stmt->fetch();

        if ($existingUser) {
            http_response_code(400);
            echo json_encode(["error" => "Username is already taken"]);
            exit();
        }
    }

    // Build update query dynamically
    $updates = [];
    $values = [];

    if (isset($data->fullName)) {
        $updates[] = "fullName = ?";
        $values[] = $data->fullName;
    }

    if (isset($data->username) && $data->username !== $user['username']) {
        $updates[] = "username = ?";
        $values[] = $data->username;
    }

    if (isset($data->newPassword) && !empty($data->newPassword)) {
        $hashedPassword = password_hash($data->newPassword, PASSWORD_BCRYPT);
        $updates[] = "password = ?";
        $values[] = $hashedPassword;
    }

    // If there are updates to make
    if (count($updates) > 0) {
        $values[] = $data->userId;
        $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($values);

        // Also update employee record if exists (name field)
        if (isset($data->fullName)) {
            $stmt = $db->prepare("UPDATE employees SET name = ? WHERE user_id = ?");
            $stmt->execute([$data->fullName, $data->userId]);
        }
    }

    // Get updated user
    $stmt = $db->prepare("SELECT id, username, fullName, email, role FROM users WHERE id = ?");
    $stmt->execute([$data->userId]);
    $updatedUser = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        "message" => "Settings updated successfully",
        "user" => $updatedUser
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
