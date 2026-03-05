<?php
// backend/php/api/photos.php
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
// If path is api/photos/123, then pathParts is ['api', 'photos', '123']
// index 0: api, index 1: photos, index 2: id
$id = (isset($pathParts[2]) && is_numeric($pathParts[2])) ? $pathParts[2] : null;

try {
    // Check if uploadedBy column exists
    $columns = $db->query("SHOW COLUMNS FROM photos LIKE 'uploadedBy'")->fetchAll();
    if (empty($columns)) {
        $db->exec("ALTER TABLE photos ADD COLUMN uploadedBy INT NULL");
    }

    if ($method === 'GET') {
        if (strpos($path, 'api/photos/patient/') === 0) {
            $patientId = end($pathParts);
            $stmt = $db->prepare("SELECT * FROM photos WHERE patientId = ? ORDER BY date DESC");
            $stmt->execute([$patientId]);
            echo json_encode($stmt->fetchAll());
        } else {
            $stmt = $db->query("SELECT * FROM photos ORDER BY date DESC");
            echo json_encode($stmt->fetchAll());
        }
    } 
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"));
        $uploadedBy = $payload['id'] ?? null;
        $stmt = $db->prepare("INSERT INTO photos (patientId, type, url, date, notes, treatmentId, uploadedBy) VALUES (?,?,?,?,?,?,?)");
        $stmt->execute([$data->patientId, $data->type, $data->url, $data->date ?? date('Y-m-d'), $data->notes ?? '', $data->treatmentId ?? null, $uploadedBy]);
        echo json_encode(["message" => "Photo added", "id" => $db->lastInsertId()]);
    }
    elseif ($method === 'PUT' && $id) {
        $data = json_decode(file_get_contents("php://input"));
        $db->prepare("UPDATE photos SET type=?, date=?, notes=? WHERE id=?")
           ->execute([$data->type, $data->date, $data->notes, $id]);
        echo json_encode(["message" => "Photo updated"]);
    }
    elseif ($method === 'DELETE' && $id) {
        // Permission check
        $stmt = $db->prepare("SELECT uploadedBy, patientId FROM photos WHERE id = ?");
        $stmt->execute([$id]);
        $photo = $stmt->fetch();

        if (!$photo) {
            http_response_code(404);
            echo json_encode(["error" => "Photo not found"]);
            exit;
        }

        $userId = $payload['id'] ?? null;
        $role = $payload['role'] ?? null;
        $tokenPatientId = $payload['patientId'] ?? null;

        $isAdmin = in_array($role, ['admin', 'doctor', 'assistant']);
        $isOwner = $photo['uploadedBy'] == $userId;
        $isPatientSelfDelete = empty($photo['uploadedBy']) && $tokenPatientId && $photo['patientId'] == $tokenPatientId;

        if (!$isAdmin && !$isOwner && !$isPatientSelfDelete) {
            http_response_code(403);
            echo json_encode(["error" => "You do not have permission to delete this photo"]);
            exit;
        }

        $stmt = $db->prepare("DELETE FROM photos WHERE id = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() === 0) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to delete photo from database"]);
            exit;
        }
        
        echo json_encode(["message" => "Photo deleted"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
