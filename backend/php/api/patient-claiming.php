<?php
// backend/php/api/patient-claiming.php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/jwt_helper.php';
require_once __DIR__ . '/../utils/sms_helper.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

// If $path is already defined in index.php, use it. Otherwise calculate it.
if (!isset($path)) {
    $request_uri = $_SERVER['REQUEST_URI'];
    $script_name = dirname($_SERVER['SCRIPT_NAME']);
    $base_path = rtrim($script_name, '/') . '/';
    $path = trim(substr($request_uri, strlen($base_path) - 1), '/');
    $path = explode('?', $path)[0];
}

try {
    if ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"));

        if ($path === 'api/patient-claiming/search') {
            $stmt = $db->prepare("SELECT id, name, lastVisit FROM patients WHERE name LIKE ? AND dateOfBirth = ? AND phone LIKE ? AND has_account = 0");
            $stmt->execute(["%".$data->fullName."%", $data->dateOfBirth, "%".$data->phone."%"]);
            $results = $stmt->fetchAll();
            echo json_encode(["found" => count($results) > 0, "matches" => count($results), "patients" => $results]);
        }
        elseif ($path === 'api/patient-claiming/select') {
            $stmt = $db->prepare("SELECT id, name, lastVisit, phone FROM patients WHERE id = ? AND has_account = 0");
            $stmt->execute([$data->patientId]);
            $patient = $stmt->fetch();
            if ($patient) {
                echo json_encode(["success" => true, "patient" => $patient]);
            } else {
                throw new Exception("Patient not found or already has an account");
            }
        }
        elseif ($path === 'api/patient-claiming/send-otp' || $path === 'api/patient-claiming/resend-otp') {
            $otp = rand(100000, 999999);
            $expires = gmdate('Y-m-d H:i:s', strtotime('+10 minutes'));
            
            $stmt = $db->prepare("SELECT phone FROM patients WHERE id = ?");
            $stmt->execute([$data->patientId]);
            $phone = $stmt->fetchColumn();
            
            $db->prepare("DELETE FROM otp_verifications WHERE patientId = ?")->execute([$data->patientId]);
            $db->prepare("INSERT INTO otp_verifications (phone, otp, expiresAt, patientId) VALUES (?,?,?,?)")
               ->execute([$phone, $otp, $expires, $data->patientId]);
            
            $smsResult = sendSMS($phone, "Your verification code is: $otp. Valid for 10 minutes.");
            if ($smsResult['success']) {
                echo json_encode(["success" => true, "message" => "OTP sent", "otp_debug" => $otp]);
            } else {
                throw new Exception("Failed to send OTP via SMS: " . $smsResult['error']);
            }
        }
        elseif ($path === 'api/patient-claiming/verify-and-link') {
            $db->beginTransaction();
            $stmt = $db->prepare("SELECT * FROM otp_verifications WHERE patientId = ? AND otp = ? AND expiresAt > UTC_TIMESTAMP() AND verified = 0");
            $stmt->execute([$data->patientId, $data->otp]);
            if (!$stmt->fetch()) throw new Exception("Invalid or expired OTP");

            $hashed = password_hash($data->userData->password, PASSWORD_BCRYPT);
            $db->prepare("INSERT INTO users (username, password, fullName, role, isFirstLogin) VALUES (?,?,?,?,0)")
               ->execute([$data->userData->username, $hashed, $data->userData->fullName, 'patient']);
            $uid = $db->lastInsertId();

            $db->prepare("UPDATE patients SET user_id = ?, has_account = 1 WHERE id = ?")->execute([$uid, $data->patientId]);
            $db->prepare("UPDATE otp_verifications SET verified = 1 WHERE patientId = ? AND otp = ?")->execute([$data->patientId, $data->otp]);
            
            $db->commit();
            echo json_encode(["success" => true, "token" => JWTHelper::generate(["id"=>$uid, "role"=>"patient"])]);
        }
    }
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
