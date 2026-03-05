<?php
// backend/php/api/appointments/update.php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

// Get ID from URL
$request_uri = $_SERVER['REQUEST_URI'];
$parts = explode('/', trim($request_uri, '/'));
$appointmentId = end($parts);

if (!is_numeric($appointmentId)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid appointment ID"]);
    exit();
}

function parseAppointmentDateTime($dateStr, $timeStr) {
    if (!$dateStr) return null;
    if (strpos($dateStr, ' ') !== false) return $dateStr;
    $time = $timeStr ?: '09:00';
    return "$dateStr $time:00";
}

function extractDateTime($dateTimeStr) {
    if (!$dateTimeStr) return ["date" => null, "time" => null];
    $parts = explode(' ', $dateTimeStr);
    return [
        "date" => $parts[0],
        "time" => isset($parts[1]) ? substr($parts[1], 0, 5) : '09:00'
    ];
}

try {
    // Get old appointment for status change detection
    $oldQuery = "SELECT * FROM appointments WHERE id = ?";
    $oldStmt = $db->prepare($oldQuery);
    $oldStmt->execute([$appointmentId]);
    $oldApt = $oldStmt->fetch(PDO::FETCH_ASSOC);

    if (!$oldApt) {
        http_response_code(404);
        echo json_encode(["error" => "Appointment not found"]);
        exit();
    }

    $appointmentDateTime = parseAppointmentDateTime($data->date ?? null, $data->time ?? null) ?: $oldApt['appointmentDateTime'];
    $roleValue = ($data->createdByRole ?? '') === 'patient' ? 'patient' : 'staff';
    $status = $data->status ?? $oldApt['status'];

    $query = "UPDATE appointments SET 
                patientId = :patientId, 
                patientName = :patientName, 
                appointmentDateTime = :appointmentDateTime, 
                type = :type, 
                duration = :duration, 
                status = :status, 
                notes = :notes, 
                createdByRole = :createdByRole 
              WHERE id = :id";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':patientId', $data->patientId ?? $oldApt['patientId']);
    $stmt->bindValue(':patientName', $data->patientName ?? $oldApt['patientName']);
    $stmt->bindValue(':appointmentDateTime', $appointmentDateTime);
    $stmt->bindValue(':type', $data->type ?? $oldApt['type']);
    $stmt->bindValue(':duration', $data->duration ?? $oldApt['duration']);
    $stmt->bindValue(':status', $status);
    $stmt->bindValue(':notes', $data->notes ?? $oldApt['notes']);
    $stmt->bindValue(':createdByRole', $roleValue);
    $stmt->bindValue(':id', $appointmentId);
    
    $stmt->execute();

    // Status change notification
    if ($roleValue === 'staff' && $oldApt['status'] !== $status) {
        $dt = extractDateTime($appointmentDateTime);
        $title = 'Appointment Updated';
        $msg = "Your appointment has been updated.";
        $type = 'appointment_updated';

        if ($status === 'cancelled') {
            $title = 'Appointment Cancelled';
            $msg = "Your " . ($oldApt['type']) . " appointment on " . $dt['date'] . " has been cancelled.";
            $type = 'appointment_cancelled';
        }

        try {
            $notifQuery = "INSERT INTO patient_notifications (patientId, appointmentId, type, title, message) VALUES (?, ?, ?, ?, ?)";
            $db->prepare($notifQuery)->execute([$data->patientId ?? $oldApt['patientId'], $appointmentId, $type, $title, $msg]);
        } catch (Exception $ne) {}
    }

    $dt = extractDateTime($appointmentDateTime);
    echo json_encode([
        "id" => (int)$appointmentId,
        "date" => $dt['date'],
        "time" => $dt['time'],
        "status" => $status
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
