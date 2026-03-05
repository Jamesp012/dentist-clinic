<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();

$database = new Database();
$db = $database->getConnection();

// Get ID from query parameters or path info
$id = $_GET['id'] ?? null;

if (!$id) {
    http_response_code(400);
    echo json_encode(["error" => "No ID provided"]);
    exit;
}

try {
    // Delete associated files first to avoid foreign key constraints
    $db->prepare("DELETE FROM referral_files WHERE referralId = ?")->execute([$id]);

    $stmt = $db->prepare("DELETE FROM referrals WHERE id = ?");
    if ($stmt->execute([$id])) {
        if ($stmt->rowCount() > 0) {
            echo json_encode(["success" => true, "message" => "Referral deleted successfully"]);
        } else {
            http_response_code(404);
            echo json_encode(["error" => "Referral not found", "id" => $id]);
        }
    } else {
        $errorInfo = $stmt->errorInfo();
        throw new Exception("Failed to delete referral. SQL Error: " . $errorInfo[2]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
