<?php
// backend/php/api/inventory/update.php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();
$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

// Get ID from URL - URL looks like api/inventory/:id
$request_uri = $_SERVER['REQUEST_URI'];
$parts = explode('/', trim($request_uri, '/'));
$id = end($parts);

if (empty($data->name) || !is_numeric($id)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid input"]);
    exit();
}

try {
    $query = "UPDATE inventory SET 
                name = :name, 
                category = :category, 
                quantity = :quantity, 
                minQuantity = :minQuantity, 
                unit = :unit, 
                unit_type = :unit_type, 
                pieces_per_box = :pieces_per_box, 
                remaining_pieces = :remaining_pieces, 
                supplier = :supplier, 
                lastOrdered = :lastOrdered, 
                cost = :cost 
              WHERE id = :id";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':name', trim($data->name));
    $stmt->bindValue(':category', $data->category ?? 'General');
    $stmt->bindValue(':quantity', (int)($data->quantity ?? 0));
    $stmt->bindValue(':minQuantity', (int)($data->minQuantity ?? 0));
    $stmt->bindValue(':unit', $data->unit ?? 'piece');
    $stmt->bindValue(':unit_type', $data->unit_type ?? 'piece');
    $stmt->bindValue(':pieces_per_box', isset($data->pieces_per_box) ? (int)$data->pieces_per_box : null);
    $stmt->bindValue(':remaining_pieces', (int)($data->remaining_pieces ?? 0));
    $stmt->bindValue(':supplier', $data->supplier ?? '');
    $stmt->bindValue(':lastOrdered', $data->lastOrdered ?? null);
    $stmt->bindValue(':cost', (float)($data->cost ?? 0));
    $stmt->bindValue(':id', $id);
    
    if ($stmt->execute()) {
        $stmt = $db->prepare("SELECT * FROM inventory WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
    } else {
        throw new Exception("Failed to update inventory item");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
