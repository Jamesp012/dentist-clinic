<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));
$id = $_GET['id'] ?? ($data->id ?? null);

if (!$id || !$data) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid request: missing ID or data"]);
    exit;
}

try {
    $query = "UPDATE referrals SET 
                patientId = :patientId, patientName = :patientName, 
                referringDentist = :referringDentist, referredByContact = :referredByContact, 
                referredByEmail = :referredByEmail, referredTo = :referredTo, 
                specialty = :specialty, reason = :reason, 
                selectedServices = :selectedServices, date = :date, 
                urgency = :urgency, referralType = :referralType, 
                source = :source, xrayDiagramSelections = :xrayDiagramSelections, 
                xrayNotes = :xrayNotes 
              WHERE id = :id";
    
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
    $stmt->bindValue(':date', $data->date ?? null);
    $stmt->bindValue(':urgency', $data->urgency ?? 'routine');
    $stmt->bindValue(':referralType', $data->referralType ?? 'outgoing');
    $stmt->bindValue(':source', $data->source ?? 'staff-upload');
    $stmt->bindValue(':xrayDiagramSelections', isset($data->xrayDiagramSelections) ? json_encode($data->xrayDiagramSelections) : null);
    $stmt->bindValue(':xrayNotes', $data->xrayNotes ?? null);
    $stmt->bindValue(':id', $id);
    
    if ($stmt->execute()) {
        echo json_encode(["success" => true]);
    } else {
        $errorInfo = $stmt->errorInfo();
        throw new Exception("Failed to update referral: " . $errorInfo[2]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
