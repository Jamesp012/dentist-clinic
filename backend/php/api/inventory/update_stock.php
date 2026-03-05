<?php
// backend/php/api/inventory/update_stock.php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();
$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

// Get ID from URL - URL looks like api/inventory/:id/update-stock
$request_uri = $_SERVER['REQUEST_URI'];
preg_match('/api\/inventory\/(\d+)\/update-stock/', $request_uri, $matches);
$id = $matches[1] ?? null;

if (!$id || empty($data->action) || !isset($data->amount)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid input"]);
    exit();
}

try {
    $db->beginTransaction();

    $stmt = $db->prepare("SELECT * FROM inventory WHERE id = ?");
    $stmt->execute([$id]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$item) {
        $db->rollBack();
        http_response_code(404);
        echo json_encode(["error" => "Item not found"]);
        exit();
    }

    $piecesPerBox = (int)($item['pieces_per_box'] ?? 1);
    $currentQty = (int)$item['quantity']; // Boxes if box, pieces if piece
    $currentRemainingPieces = (int)$item['remaining_pieces']; // Remaining pieces in current box
    
    // Total pieces calculation
    $currentTotalPieces = ($item['unit_type'] === 'box') ? ($currentQty * $piecesPerBox + $currentRemainingPieces) : $currentQty;

    $unitType = $data->unitType ?? 'piece';
    $changeInPieces = ($unitType === 'pcs' || $unitType === 'piece') ? $data->amount : ($data->amount * $piecesPerBox);

    $newTotalPieces = $currentTotalPieces;
    if ($data->action === 'add') {
        $newTotalPieces = $currentTotalPieces + $changeInPieces;
    } else if ($data->action === 'subtract') {
        $newTotalPieces = max(0, $currentTotalPieces - $changeInPieces);
    } else if ($data->action === 'set') {
        $newTotalPieces = $changeInPieces;
    }

    $newQty = 0;
    $newRemainingPieces = 0;

    if ($item['unit_type'] === 'box') {
        $newQty = floor($newTotalPieces / $piecesPerBox);
        $newRemainingPieces = $newTotalPieces % $piecesPerBox;
    } else {
        $newQty = $newTotalPieces;
        $newRemainingPieces = 0;
    }

    $updateQuery = "UPDATE inventory SET quantity = :qty, remaining_pieces = :rem WHERE id = :id";
    $updateStmt = $db->prepare($updateQuery);
    $updateStmt->bindValue(':qty', $newQty);
    $updateStmt->bindValue(':rem', $newRemainingPieces);
    $updateStmt->bindValue(':id', $id);
    $updateStmt->execute();

    $db->commit();
    
    $stmt = $db->prepare("SELECT * FROM inventory WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
