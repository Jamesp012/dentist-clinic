<?php
// backend/php/api/appointments/get_all.php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();

$database = new Database();
$db = $database->getConnection();

function extractDateTime($dateTimeStr) {
    if (!$dateTimeStr) return ["date" => null, "time" => null];
    $parts = explode(' ', $dateTimeStr);
    return [
        "date" => $parts[0],
        "time" => isset($parts[1]) ? substr($parts[1], 0, 5) : '09:00'
    ];
}

try {
    $query = "SELECT * FROM appointments ORDER BY appointmentDateTime ASC";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $formatted = array_map(function($apt) {
        $dt = extractDateTime($apt['appointmentDateTime']);
        $apt['date'] = $dt['date'];
        $apt['time'] = $dt['time'];
        return $apt;
    }, $appointments);

    echo json_encode($formatted);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
