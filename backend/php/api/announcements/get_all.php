<?php
// backend/php/api/announcements/get_all.php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();
$database = new Database();
$db = $database->getConnection();

try {
    $query = "SELECT * FROM announcements ORDER BY createdAt DESC";
    $stmt = $db->prepare($query);
    $stmt->execute();
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
