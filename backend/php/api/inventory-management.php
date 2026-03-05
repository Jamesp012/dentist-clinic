<?php
// backend/php/api/inventory-management.php
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
    if ($path === 'api/inventory-management/overview') {
        $totalItems = $db->query("SELECT COUNT(*) FROM inventory")->fetchColumn();
        $lowStock = $db->query("SELECT COUNT(*) FROM inventory WHERE quantity <= minQuantity")->fetchColumn();
        $outOfStock = $db->query("SELECT COUNT(*) FROM inventory WHERE quantity = 0")->fetchColumn();
        echo json_encode([
            "totalItems" => (int)$totalItems, 
            "lowStock" => (int)$lowStock, 
            "outOfStock" => (int)$outOfStock
        ]);
    }
    elseif ($path === 'api/inventory-management/alerts') {
        $stmt = $db->query("SELECT * FROM inventory WHERE quantity <= minQuantity AND quantity > 0 ORDER BY quantity ASC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    elseif ($path === 'api/inventory-management/auto-reduction/rules') {
        if ($method === 'GET') {
            $stmt = $db->query("SELECT r.*, i.name as itemName FROM inventory_auto_reduction_rules r JOIN inventory i ON r.inventoryItemId = i.id");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } elseif ($method === 'POST') {
            $data = json_decode(file_get_contents("php://input"));
            $stmt = $db->prepare("INSERT INTO inventory_auto_reduction_rules (inventoryItemId, appointmentType, quantityToReduce, isActive) VALUES (:itemId, :type, :qty, :active)");
            $stmt->bindValue(':itemId', $data->inventoryItemId);
            $stmt->bindValue(':type', $data->appointmentType);
            $stmt->bindValue(':qty', $data->quantityToReduce ?? 1);
            $stmt->bindValue(':active', $data->isActive ?? true, PDO::PARAM_BOOL);
            $stmt->execute();
            echo json_encode(["success" => true, "id" => $db->lastInsertId()]);
        }
    }
    elseif ($m = matches('api/inventory-management/auto-reduction/rules/(\d+)', $path)) {
        $id = $m[1];
        if ($method === 'PUT') {
            $data = json_decode(file_get_contents("php://input"));
            $stmt = $db->prepare("UPDATE inventory_auto_reduction_rules SET inventoryItemId = :itemId, appointmentType = :type, quantityToReduce = :qty, isActive = :active WHERE id = :id");
            $stmt->bindValue(':itemId', $data->inventoryItemId);
            $stmt->bindValue(':type', $data->appointmentType);
            $stmt->bindValue(':qty', $data->quantityToReduce);
            $stmt->bindValue(':active', $data->isActive, PDO::PARAM_BOOL);
            $stmt->bindValue(':id', $id);
            $stmt->execute();
            echo json_encode(["success" => true]);
        } elseif ($method === 'DELETE') {
            $db->prepare("DELETE FROM inventory_auto_reduction_rules WHERE id = ?")->execute([$id]);
            echo json_encode(["success" => true]);
        }
    }
    elseif ($m = matches('api/inventory-management/auto-reduction/rules/type/(.+)', $path)) {
        $type = urldecode($m[1]);
        $stmt = $db->prepare("SELECT r.*, i.name as itemName FROM inventory_auto_reduction_rules r JOIN inventory i ON r.inventoryItemId = i.id WHERE r.appointmentType = ? AND r.isActive = 1");
        $stmt->execute([$type]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    elseif ($m = matches('api/inventory-management/auto-reduction/rules/reset/(.+)', $path)) {
        $type = urldecode($m[1]);
        $db->prepare("DELETE FROM inventory_auto_reduction_rules WHERE appointmentType = ?")->execute([$type]);
        echo json_encode(["success" => true]);
    }
    elseif ($path === 'api/inventory-management/history') {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        $stmt = $db->prepare("SELECT * FROM inventory_reduction_history ORDER BY reducedAt DESC LIMIT :limit OFFSET :offset");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    elseif (strpos($path, 'api/inventory-management/history/patient/') !== false) {
        $parts = explode('/', $path);
        $pid = end($parts);
        $stmt = $db->prepare("SELECT * FROM inventory_reduction_history WHERE patientId = ? ORDER BY reducedAt DESC");
        $stmt->execute([$pid]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    elseif (strpos($path, 'api/inventory-management/history/appointment/') !== false) {
        $parts = explode('/', $path);
        $aid = end($parts);
        $stmt = $db->prepare("SELECT * FROM inventory_reduction_history WHERE appointmentId = ? ORDER BY reducedAt DESC");
        $stmt->execute([$aid]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    elseif (strpos($path, 'api/inventory-management/history/item/') !== false) {
        $parts = explode('/', $path);
        $iid = end($parts);
        $stmt = $db->prepare("SELECT * FROM inventory_reduction_history WHERE inventoryItemId = ? ORDER BY reducedAt DESC");
        $stmt->execute([$iid]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    elseif ($m = matches('api/inventory-management/auto-reduce/appointment/(\d+)', $path)) {
        $appId = $m[1];
        $db->beginTransaction();
        
        $stmt = $db->prepare("SELECT type, patientId, patientName FROM appointments WHERE id = ?");
        $stmt->execute([$appId]);
        $app = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($app) {
            $stmt = $db->prepare("SELECT r.*, i.name as itemName, i.quantity as currentQty FROM inventory_auto_reduction_rules r JOIN inventory i ON r.inventoryItemId = i.id WHERE r.appointmentType = ? AND r.isActive = 1");
            $stmt->execute([$app['type']]);
            $rules = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($rules as $rule) {
                $qtyToReduce = $rule['quantityToReduce'];
                $newQty = $rule['currentQty'] - $qtyToReduce;
                
                // Update inventory
                $updateStmt = $db->prepare("UPDATE inventory SET quantity = :newQty WHERE id = :id");
                $updateStmt->bindValue(':newQty', $newQty);
                $updateStmt->bindValue(':id', $rule['inventoryItemId']);
                $updateStmt->execute();
                
                // Record history
                $historyStmt = $db->prepare("INSERT INTO inventory_reduction_history 
                    (appointmentId, patientId, patientName, appointmentType, inventoryItemId, inventoryItemName, quantityReduced, quantityBefore, quantityAfter) 
                    VALUES (:aid, :pid, :pname, :atype, :iid, :iname, :qred, :qbef, :qaft)");
                
                $historyStmt->bindValue(':aid', $appId);
                $historyStmt->bindValue(':pid', $app['patientId']);
                $historyStmt->bindValue(':pname', $app['patientName']);
                $historyStmt->bindValue(':atype', $app['type']);
                $historyStmt->bindValue(':iid', $rule['inventoryItemId']);
                $historyStmt->bindValue(':iname', $rule['itemName']);
                $historyStmt->bindValue(':qred', $qtyToReduce);
                $historyStmt->bindValue(':qbef', $rule['currentQty']);
                $historyStmt->bindValue(':qaft', $newQty);
                $historyStmt->execute();
            }
        }
        
        $db->commit();
        echo json_encode(["success" => true]);
    }
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
