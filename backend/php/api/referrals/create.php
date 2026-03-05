<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (!$data) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid input data"]);
    exit;
}

try {
    $query = "INSERT INTO referrals (
                patientId, patientName, referringDentist, referredByContact, 
                referredByEmail, referredTo, specialty, reason, 
                selectedServices, date, urgency, createdByRole, 
                referralType, source, xrayDiagramSelections, xrayNotes
            ) VALUES (
                :patientId, :patientName, :referringDentist, :referredByContact, 
                :referredByEmail, :referredTo, :specialty, :reason, 
                :selectedServices, :date, :urgency, :createdByRole, 
                :referralType, :source, :xrayDiagramSelections, :xrayNotes
            )";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':patientId', (!empty($data->patientId)) ? $data->patientId : null);
    $stmt->bindValue(':patientName', $data->patientName ?? null);
    $stmt->bindValue(':referringDentist', $data->referringDentist ?? null);
    $stmt->bindValue(':referredByContact', $data->referredByContact ?? null);
    $stmt->bindValue(':referredByEmail', $data->referredByEmail ?? null);
    $stmt->bindValue(':referredTo', $data->referredTo ?? null);
    $stmt->bindValue(':specialty', $data->specialty ?? null);
    $stmt->bindValue(':reason', $data->reason ?? null);
    $stmt->bindValue(':selectedServices', isset($data->selectedServices) ? json_encode($data->selectedServices) : null);
    $stmt->bindValue(':date', $data->date ?? date('Y-m-d'));
    $stmt->bindValue(':urgency', $data->urgency ?? 'routine');
    $stmt->bindValue(':createdByRole', $data->createdByRole ?? 'staff');
    $stmt->bindValue(':referralType', $data->referralType ?? 'outgoing');
    $stmt->bindValue(':source', $data->source ?? 'staff-upload');
    $stmt->bindValue(':xrayDiagramSelections', isset($data->xrayDiagramSelections) ? json_encode($data->xrayDiagramSelections) : null);
    $stmt->bindValue(':xrayNotes', $data->xrayNotes ?? null);
    
    if ($stmt->execute()) {
        $referralId = $db->lastInsertId();

        // Handle attached files if any
        if (!empty($data->uploadedFileIds) && is_array($data->uploadedFileIds)) {
            $fileIds = $data->uploadedFileIds;
            $placeholders = str_repeat('?,', count($fileIds) - 1) . '?';
            $updateQuery = "UPDATE referral_files SET referralId = ? WHERE id IN ($placeholders)";
            $updateStmt = $db->prepare($updateQuery);
            $updateStmt->execute(array_merge([$referralId], $fileIds));
        }

        // Fetch the newly created referral to return it fully populated
        $getStmt = $db->prepare("SELECT * FROM referrals WHERE id = ?");
        $getStmt->execute([$referralId]);
        $newReferral = $getStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($newReferral) {
            if ($newReferral['selectedServices']) $newReferral['selectedServices'] = json_decode($newReferral['selectedServices'], true);
            if ($newReferral['xrayDiagramSelections']) $newReferral['xrayDiagramSelections'] = json_decode($newReferral['xrayDiagramSelections'], true);
            $newReferral['uploadedFiles'] = []; // Initial empty files
        }

        echo json_encode($newReferral);
    } else {
        $errorInfo = $stmt->errorInfo();
        throw new Exception("Failed to create referral: " . $errorInfo[2]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
