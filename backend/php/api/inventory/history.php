<?php
// backend/php/api/inventory/history.php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();
$database = new Database();
$db = $database->getConnection();

$request_uri = $_SERVER['REQUEST_URI'];
$id = null;
if (preg_match('/api\/inventory\/(\d+)\/history/', $request_uri, $matches)) {
    $id = $matches[1];
}

try {
    if ($id) {
        $query = "SELECT * FROM inventory_history WHERE inventory_id = ? ORDER BY created_at DESC";
        $stmt = $db->prepare($query);
        $stmt->execute([$id]);
    } else {
        $query = "SELECT h.*, i.name as item_name FROM inventory_history h JOIN inventory i ON h.inventory_id = i.id ORDER BY h.created_at DESC LIMIT 100";
        $stmt = $db->prepare($query);
        $stmt->execute();
    }
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
