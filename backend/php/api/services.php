<?php
// backend/php/api/services.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/jwt_helper.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

// If $path is already defined in index.php, use it. Otherwise calculate it.
if (!isset($path)) {
    $request_uri = $_SERVER['REQUEST_URI'];
    $script_name = dirname($_SERVER['SCRIPT_NAME']);
    $base_path = rtrim($script_name, '/') . '/';
    $path = trim(substr($request_uri, strlen($base_path) - 1), "/ \t\n\r\0\x0B");
    $path = explode('?', $path)[0];
}

if (!function_exists('matches')) {
    function matches($pattern, $path) {
        $path = trim($path, "/ \t\n\r\0\x0B");
        return preg_match("#^" . $pattern . "$#", $path, $matches) ? $matches : false;
    }
}

try {
    $clean_path = trim($path, "/ \t\n\r\0\x0B");
    if (($clean_path === 'api/services' || $clean_path === 'api/services/') && $method === 'GET') {
        $stmt = $db->query("SELECT * FROM serviceprices ORDER BY serviceName ASC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    elseif (($clean_path === 'api/services' || $clean_path === 'api/services/') && $method === 'POST') {
        $data = json_decode(file_get_contents("php://input"));
        $stmt = $db->prepare("INSERT INTO serviceprices (serviceName, description, price, category, duration) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([
            $data->serviceName,
            $data->description ?? null,
            $data->price ?? null,
            $data->category ?? null,
            $data->duration ?? null
        ]);
        
        $id = $db->lastInsertId();
        $stmt = $db->prepare("SELECT * FROM serviceprices WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
    }
    elseif ($m = matches('api/services/(\d+)', $clean_path)) {
        $id = $m[1];
        if ($method === 'PUT') {
            $data = json_decode(file_get_contents("php://input"));
            $stmt = $db->prepare("UPDATE serviceprices SET serviceName = ?, description = ?, price = ?, category = ?, duration = ? WHERE id = ?");
            $stmt->execute([
                $data->serviceName,
                $data->description ?? null,
                $data->price ?? null,
                $data->category ?? null,
                $data->duration ?? null,
                $id
            ]);
            
            $stmt = $db->prepare("SELECT * FROM serviceprices WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
        }
        elseif ($method === 'DELETE') {
            $db->prepare("DELETE FROM serviceprices WHERE id = ?")->execute([$id]);
            echo json_encode(["message" => "Service deleted successfully"]);
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
