<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();

$database = new Database();
$db = $database->getConnection();

$id = $_GET['id'] ?? null;

if (!$id) {
    http_response_code(400);
    echo json_encode(["error" => "No ID provided"]);
    exit;
}

try {
    $stmt = $db->prepare("SELECT * FROM referrals WHERE id = ?");
    $stmt->execute([$id]);
    $referral = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($referral) {
        if ($referral['selectedServices']) $referral['selectedServices'] = json_decode($referral['selectedServices'], true);
        if ($referral['xrayDiagramSelections']) $referral['xrayDiagramSelections'] = json_decode($referral['xrayDiagramSelections'], true);
        
        // Fetch files for this referral
        $fileStmt = $db->prepare("SELECT * FROM referral_files WHERE referralId = ?");
        $fileStmt->execute([$id]);
        $referral['uploadedFiles'] = $fileStmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode($referral);
    } else {
        http_response_code(404);
        echo json_encode(["error" => "Referral not found"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
