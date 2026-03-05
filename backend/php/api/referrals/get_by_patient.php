<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();

$database = new Database();
$db = $database->getConnection();

$patientId = $_GET['patientId'] ?? null;

if (!$patientId) {
    http_response_code(400);
    echo json_encode(["error" => "No patient ID provided"]);
    exit;
}

try {
    $stmt = $db->prepare("SELECT * FROM referrals WHERE patientId = ? ORDER BY date DESC, createdAt DESC");
    $stmt->execute([$patientId]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Fetch all referral files for this patient's referrals
    $referralIds = array_map(function($r) { return $r['id']; }, $results);
    $filesByReferral = [];
    
    if (!empty($referralIds)) {
        $placeholders = implode(',', array_fill(0, count($referralIds), '?'));
        $fileStmt = $db->prepare("SELECT * FROM referral_files WHERE referralId IN ($placeholders)");
        $fileStmt->execute($referralIds);
        $allFiles = $fileStmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($allFiles as $file) {
            $rid = $file['referralId'];
            if (!isset($filesByReferral[$rid])) $filesByReferral[$rid] = [];
            $filesByReferral[$rid][] = $file;
        }
    }
    
    foreach ($results as &$r) {
        if ($r['selectedServices']) $r['selectedServices'] = json_decode($r['selectedServices'], true);
        if ($r['xrayDiagramSelections']) $r['xrayDiagramSelections'] = json_decode($r['xrayDiagramSelections'], true);
        $r['uploadedFiles'] = isset($filesByReferral[$r['id']]) ? $filesByReferral[$r['id']] : [];
    }
    
    echo json_encode($results);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
