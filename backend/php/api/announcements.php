<?php
// backend/php/api/announcements.php
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
    $path = trim(substr($request_uri, strlen($base_path) - 1), '/');
    $path = explode('?', $path)[0];
}

if (!function_exists('matches')) {
    function matches($pattern, $path) {
        return preg_match("#^" . $pattern . "$#", $path, $matches) ? $matches : false;
    }
}

try {
    if (($path === 'api/announcements' || $path === 'api/announcements/') && $method === 'GET') {
        $stmt = $db->query("SELECT * FROM announcements ORDER BY date DESC, createdAt DESC");
        echo json_encode($stmt->fetchAll());
    }
    elseif (($path === 'api/announcements' || $path === 'api/announcements/') && $method === 'POST') {
        $data = json_decode(file_get_contents("php://input"));
        $stmt = $db->prepare("INSERT INTO announcements (title, message, type, date, createdBy) VALUES (?,?,?,?,?)");
        $stmt->execute([
            $data->title, 
            $data->message, 
            $data->type ?? 'general',
            $data->date ?? date('Y-m-d'),
            $data->createdBy ?? 'Admin'
        ]);
        
        $id = $db->lastInsertId();
        $stmt = $db->prepare("SELECT * FROM announcements WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
    }
    elseif ($m = matches('api/announcements/(\d+)', $path)) {
        $id = $m[1];
        if ($method === 'DELETE') {
            $db->prepare("DELETE FROM announcements WHERE id = ?")->execute([$id]);
            echo json_encode(["success" => true]);
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
