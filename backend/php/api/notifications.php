<?php
// backend/php/api/notifications.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth_middleware.php';

$payload = authorize();
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

$pathParts = explode('/', $path);
$id = (isset($pathParts[1]) && is_numeric($pathParts[1])) ? $pathParts[1] : null;

try {
    if ($method === 'GET') {
        if (strpos($path, 'api/notifications/unread/count') !== false) {
            $query = "SELECT COUNT(*) as count FROM patient_notifications WHERE isRead = 0";
            if ($payload['role'] === 'patient') $query .= " AND patientId = " . $payload['patientId'];
            echo json_encode(["unreadCount" => (int)$db->query($query)->fetchColumn()]);
        } 
        elseif (preg_match('/api\/notifications\/patient\/(\d+)/', $path, $m)) {
            $pid = $m[1];
            $stmt = $db->prepare("SELECT * FROM patient_notifications WHERE patientId = ? ORDER BY createdAt DESC");
            $stmt->execute([$pid]);
            echo json_encode($stmt->fetchAll());
        }
        else {
            $query = "SELECT * FROM patient_notifications";
            if ($payload['role'] === 'patient') $query .= " WHERE patientId = " . $payload['patientId'];
            $query .= " ORDER BY createdAt DESC";
            echo json_encode($db->query($query)->fetchAll());
        }
    }
    elseif ($method === 'PUT') {
        if ($id && strpos($path, '/read') !== false) {
            $db->prepare("UPDATE patient_notifications SET isRead = 1, readAt = NOW() WHERE id = ?")->execute([$id]);
            echo json_encode(["success" => true]);
        }
        elseif ($path === 'api/notifications/read-all') {
            $data = json_decode(file_get_contents("php://input"));
            $pid = ($payload['role'] === 'patient') ? $payload['patientId'] : ($data->patientId ?? null);
            if ($pid) {
                $db->prepare("UPDATE patient_notifications SET isRead = 1, readAt = NOW() WHERE patientId = ? AND isRead = 0")->execute([$pid]);
            }
            echo json_encode(["success" => true]);
        }
    }
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"));
        $stmt = $db->prepare("INSERT INTO patient_notifications (patientId, appointmentId, type, title, message) VALUES (?,?,?,?,?)");
        $stmt->execute([$data->patientId, $data->appointmentId ?? null, $data->type ?? 'appointment_created', $data->title, $data->message]);
        echo json_encode(["id" => $db->lastInsertId()]);
    }
    elseif ($method === 'DELETE' && $id) {
        $db->prepare("DELETE FROM patient_notifications WHERE id = ?")->execute([$id]);
        echo json_encode(["success" => true]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
