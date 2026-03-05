<?php
// backend/php/api/prescriptions.php
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

if (!function_exists('matches')) {
    function matches($pattern, $path) {
        return preg_match("#^" . $pattern . "$#", $path, $matches) ? $matches : false;
    }
}

try {
    if ($path === 'api/prescriptions' && $method === 'GET') {
        $stmt = $db->query("SELECT * FROM prescriptions ORDER BY createdAt DESC");
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($results as &$r) {
            if ($r['medications']) $r['medications'] = json_decode($r['medications']);
        }
        echo json_encode($results);
    }
    elseif ($path === 'api/prescriptions' && $method === 'POST') {
        $data = json_decode(file_get_contents("php://input"));
        
        if (!$data->patientId || !$data->dentist || !isset($data->medications)) {
            http_response_code(400);
            echo json_encode(["error" => "Missing required fields"]);
            exit;
        }

        $query = "INSERT INTO prescriptions (
                    patientId, patientName, dentist, licenseNumber, 
                    ptrNumber, medications, notes, date
                ) VALUES (
                    :patientId, :patientName, :dentist, :licenseNumber, 
                    :ptrNumber, :medications, :notes, :date
                )";
        
        $stmt = $db->prepare($query);
        $stmt->bindValue(':patientId', $data->patientId);
        $stmt->bindValue(':patientName', $data->patientName ?? '');
        $stmt->bindValue(':dentist', $data->dentist);
        $stmt->bindValue(':licenseNumber', $data->licenseNumber ?? null);
        $stmt->bindValue(':ptrNumber', $data->ptrNumber ?? null);
        $stmt->bindValue(':medications', json_encode($data->medications));
        $stmt->bindValue(':notes', $data->notes ?? '');
        $stmt->bindValue(':date', $data->date ?? date('Y-m-d'));
        
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "id" => $db->lastInsertId()]);
        } else {
            throw new Exception("Failed to create prescription");
        }
    }
    elseif ($m = matches('api/prescriptions/(\d+)', $path)) {
        $id = $m[1];
        if ($method === 'GET') {
            $stmt = $db->prepare("SELECT * FROM prescriptions WHERE id = ?");
            $stmt->execute([$id]);
            $record = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($record && $record['medications']) $record['medications'] = json_decode($record['medications']);
            echo json_encode($record);
        } elseif ($method === 'PUT') {
            $data = json_decode(file_get_contents("php://input"));
            $query = "UPDATE prescriptions SET 
                        patientId = :patientId, patientName = :patientName, 
                        dentist = :dentist, licenseNumber = :licenseNumber, 
                        ptrNumber = :ptrNumber, medications = :medications, 
                        notes = :notes, date = :date 
                      WHERE id = :id";
            
            $stmt = $db->prepare($query);
            $stmt->bindValue(':patientId', $data->patientId);
            $stmt->bindValue(':patientName', $data->patientName ?? '');
            $stmt->bindValue(':dentist', $data->dentist);
            $stmt->bindValue(':licenseNumber', $data->licenseNumber ?? null);
            $stmt->bindValue(':ptrNumber', $data->ptrNumber ?? null);
            $stmt->bindValue(':medications', json_encode($data->medications));
            $stmt->bindValue(':notes', $data->notes ?? '');
            $stmt->bindValue(':date', $data->date ?? date('Y-m-d'));
            $stmt->bindValue(':id', $id);
            
            if ($stmt->execute()) {
                echo json_encode(["success" => true]);
            } else {
                throw new Exception("Failed to update prescription");
            }
        } elseif ($method === 'DELETE') {
            $db->prepare("DELETE FROM prescriptions WHERE id = ?")->execute([$id]);
            echo json_encode(["success" => true]);
        }
    }
    elseif ($m = matches('api/prescriptions/patient/(\d+)', $path)) {
        $patientId = $m[1];
        $stmt = $db->prepare("SELECT * FROM prescriptions WHERE patientId = ? ORDER BY createdAt DESC");
        $stmt->execute([$patientId]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($results as &$r) {
            if ($r['medications']) $r['medications'] = json_decode($r['medications']);
        }
        echo json_encode($results);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
