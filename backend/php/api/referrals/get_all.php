<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();

$database = new Database();
$db = $database->getConnection();

try {
    $stmt = $db->query("SELECT * FROM referrals ORDER BY date DESC, createdAt DESC");
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Fetch all referral files to associate with referrals
    $fileStmt = $db->query("SELECT * FROM referral_files");
    $allFiles = $fileStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Group files by referralId
    $filesByReferral = [];
    foreach ($allFiles as $file) {
        $rid = $file['referralId'];
        if ($rid) {
            if (!isset($filesByReferral[$rid])) $filesByReferral[$rid] = [];
            $filesByReferral[$rid][] = $file;
        }
    }
    
    // Decode JSON fields for each result and attach files
    foreach ($results as &$r) {
        if (isset($r['selectedServices']) && $r['selectedServices']) {
            $r['selectedServices'] = json_decode($r['selectedServices'], true);
        }
        if (isset($r['xrayDiagramSelections']) && $r['xrayDiagramSelections']) {
            $r['xrayDiagramSelections'] = json_decode($r['xrayDiagramSelections'], true);
        }
        
        $r['uploadedFiles'] = isset($filesByReferral[$r['id']]) ? $filesByReferral[$r['id']] : [];
    }
    
    echo json_encode($results);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
}
?>
