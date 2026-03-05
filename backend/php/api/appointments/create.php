<?php
// backend/php/api/appointments/create.php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (empty($data->patientId) || empty($data->date)) {
    http_response_code(400);
    echo json_encode(["error" => "Patient ID and date are required"]);
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
    $appointmentDateTime = parseAppointmentDateTime($data->date, $data->time ?? null);
    $roleValue = ($data->createdByRole ?? '') === 'patient' ? 'patient' : 'staff';
    $duration = $data->duration ?? 60;
    $status = 'scheduled';

    $query = "INSERT INTO appointments (patientId, patientName, appointmentDateTime, type, duration, status, notes, createdByRole) 
              VALUES (:patientId, :patientName, :appointmentDateTime, :type, :duration, :status, :notes, :createdByRole)";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':patientId', $data->patientId);
    $stmt->bindValue(':patientName', $data->patientName ?? null);
    $stmt->bindValue(':appointmentDateTime', $appointmentDateTime);
    $stmt->bindValue(':type', $data->type ?? null);
    $stmt->bindValue(':duration', $duration);
    $stmt->bindValue(':status', $status);
    $stmt->bindValue(':notes', $data->notes ?? null);
    $stmt->bindValue(':createdByRole', $roleValue);
    
    $stmt->execute();
    $appointmentId = $db->lastInsertId();

    // Notification logic
    if ($roleValue === 'staff' && !empty($data->patientId)) {
        $dt = extractDateTime($appointmentDateTime);
        $title = 'New Appointment Scheduled';
        $message = "Your " . ($data->type ?? 'dental') . " appointment has been scheduled for " . $dt['date'] . " at " . $dt['time'] . ". Duration: $duration minutes.";
        
        try {
            $notifQuery = "INSERT INTO patient_notifications (patientId, appointmentId, type, title, message) VALUES (?, ?, ?, ?, ?)";
            $notifStmt = $db->prepare($notifQuery);
            $notifStmt->execute([$data->patientId, $appointmentId, 'appointment_created', $title, $message]);
        } catch (Exception $ne) {
            // Ignore notification errors
        }
    }

    $dt = extractDateTime($appointmentDateTime);
    echo json_encode([
        "id" => (int)$appointmentId,
        "patientId" => $data->patientId,
        "patientName" => $data->patientName ?? null,
        "date" => $dt['date'],
        "time" => $dt['time'],
        "appointmentDateTime" => $appointmentDateTime,
        "type" => $data->type ?? null,
        "duration" => $duration,
        "notes" => $data->notes ?? null,
        "status" => $status,
        "createdByRole" => $roleValue
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
