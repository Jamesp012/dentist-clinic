<?php
// backend/php/api/payments.php
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

function updatePatientBalance($patientId, $db) {
    $stmt = $db->prepare("SELECT SUM(remainingBalance) as totalBalance FROM treatmentrecords WHERE patientId = ?");
    $stmt->execute([$patientId]);
    $row = $stmt->fetch();
    $totalBalance = $row['totalBalance'] ?? 0;

    $stmt = $db->prepare("UPDATE patients SET totalBalance = ? WHERE id = ?");
    $stmt->execute([$totalBalance, $patientId]);
}

function updateTreatmentBalance($treatmentRecordId, $db) {
    if (!$treatmentRecordId) return;

    $stmt = $db->prepare("SELECT cost, patientId FROM treatmentrecords WHERE id = ?");
    $stmt->execute([$treatmentRecordId]);
    $record = $stmt->fetch();
    if (!$record) return;
    $cost = $record['cost'];
    $patientId = $record['patientId'];

    $stmt = $db->prepare("SELECT SUM(amount) as totalPaid FROM payments WHERE treatmentRecordId = ?");
    $stmt->execute([$treatmentRecordId]);
    $row = $stmt->fetch();
    $totalPaid = $row['totalPaid'] ?? 0;

    $remainingBalance = max(0, $cost - $totalPaid);

    $stmt = $db->prepare("UPDATE treatmentrecords SET amountPaid = ?, remainingBalance = ? WHERE id = ?");
    $stmt->execute([$totalPaid, $remainingBalance, $treatmentRecordId]);

    updatePatientBalance($patientId, $db);
}

try {
    if ($path === 'api/payments' && $method === 'GET') {
        $stmt = $db->query("SELECT * FROM payments ORDER BY paymentDate DESC, createdAt DESC");
        echo json_encode($stmt->fetchAll());
    }
    elseif ($path === 'api/payments' && $method === 'POST') {
        $data = json_decode(file_get_contents("php://input"));
        
        $db->beginTransaction();
        
        $query = "INSERT INTO payments (
                    patientId, treatmentRecordId, amount, 
                    paymentDate, paymentMethod, status, 
                    notes, recordedBy
                ) VALUES (
                    :patientId, :treatmentRecordId, :amount, 
                    :paymentDate, :paymentMethod, :status, 
                    :notes, :recordedBy
                )";
        
        $stmt = $db->prepare($query);
        $stmt->bindValue(':patientId', $data->patientId);
        $stmt->bindValue(':treatmentRecordId', $data->treatmentRecordId ?? null);
        $stmt->bindValue(':amount', $data->amount);
        $stmt->bindValue(':paymentDate', $data->paymentDate ?? date('Y-m-d'));
        $stmt->bindValue(':paymentMethod', $data->paymentMethod ?? 'cash');
        $stmt->bindValue(':status', $data->status ?? 'pending');
        $stmt->bindValue(':notes', $data->notes ?? null);
        $stmt->bindValue(':recordedBy', $data->recordedBy ?? null);
        
        if ($stmt->execute()) {
            $paymentId = $db->lastInsertId();
            
            if (!empty($data->treatmentRecordId)) {
                updateTreatmentBalance($data->treatmentRecordId, $db);
            } else {
                updatePatientBalance($data->patientId, $db);
            }
            
            $db->commit();
            echo json_encode(["success" => true, "id" => $paymentId]);
        } else {
            $db->rollBack();
            throw new Exception("Failed to create payment record");
        }
    }
    elseif ($m = matches('api/payments/(\d+)', $path)) {
        $id = $m[1];
        if ($method === 'DELETE') {
            $db->beginTransaction();
            
            $stmt = $db->prepare("SELECT patientId, treatmentRecordId FROM payments WHERE id = ?");
            $stmt->execute([$id]);
            $payment = $stmt->fetch();
            
            if ($payment) {
                $db->prepare("DELETE FROM payments WHERE id = ?")->execute([$id]);
                
                if (!empty($payment['treatmentRecordId'])) {
                    updateTreatmentBalance($payment['treatmentRecordId'], $db);
                } else {
                    updatePatientBalance($payment['patientId'], $db);
                }
                
                $db->commit();
                echo json_encode(["success" => true]);
            } else {
                $db->rollBack();
                http_response_code(404);
                echo json_encode(["error" => "Payment not found"]);
            }
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
