<?php
// backend/php/api/treatment-records.php
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
    if ($path === 'api/treatment-records' && $method === 'GET') {
        $stmt = $db->query("SELECT * FROM treatmentrecords ORDER BY date DESC, createdAt DESC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    elseif ($path === 'api/treatment-records' && $method === 'POST') {
        $data = json_decode(file_get_contents("php://input"));
        
        $query = "INSERT INTO treatmentrecords (
                    patientId, date, treatment, tooth, notes, 
                    cost, dentist, paymentType, amountPaid, 
                    remainingBalance, installmentPlan
                ) VALUES (
                    :patientId, :date, :treatment, :tooth, :notes, 
                    :cost, :dentist, :paymentType, :amountPaid, 
                    :remainingBalance, :installmentPlan
                )";
        
        $stmt = $db->prepare($query);
        $stmt->bindValue(':patientId', $data->patientId ?? null);
        $stmt->bindValue(':date', $data->date ?? date('Y-m-d'));
        $stmt->bindValue(':treatment', $data->treatment ?? null);
        $stmt->bindValue(':tooth', $data->tooth ?? null);
        $stmt->bindValue(':notes', $data->notes ?? null);
        $stmt->bindValue(':cost', $data->cost ?? 0);
        $stmt->bindValue(':dentist', $data->dentist ?? null);
        $stmt->bindValue(':paymentType', $data->paymentType ?? 'full');
        $stmt->bindValue(':amountPaid', $data->amountPaid ?? 0);
        $stmt->bindValue(':remainingBalance', $data->remainingBalance ?? 0);
        $stmt->bindValue(':installmentPlan', isset($data->installmentPlan) ? json_encode($data->installmentPlan) : null);
        
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "id" => $db->lastInsertId()]);
        } else {
            throw new Exception("Failed to create treatment record");
        }
    }
    elseif ($m = matches('api/treatment-records/(\d+)', $path)) {
        $id = $m[1];
        if ($method === 'GET') {
            $stmt = $db->prepare("SELECT * FROM treatmentrecords WHERE id = ?");
            $stmt->execute([$id]);
            $record = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($record && $record['installmentPlan']) $record['installmentPlan'] = json_decode($record['installmentPlan']);
            echo json_encode($record);
        } elseif ($method === 'PUT') {
            $data = json_decode(file_get_contents("php://input"));
            $query = "UPDATE treatmentrecords SET 
                        date = :date, treatment = :treatment, tooth = :tooth, 
                        notes = :notes, cost = :cost, dentist = :dentist, 
                        paymentType = :paymentType, amountPaid = :amountPaid, 
                        remainingBalance = :remainingBalance, installmentPlan = :installmentPlan 
                      WHERE id = :id";
            
            $stmt = $db->prepare($query);
            $stmt->bindValue(':date', $data->date ?? null);
            $stmt->bindValue(':treatment', $data->treatment ?? null);
            $stmt->bindValue(':tooth', $data->tooth ?? null);
            $stmt->bindValue(':notes', $data->notes ?? null);
            $stmt->bindValue(':cost', $data->cost ?? 0);
            $stmt->bindValue(':dentist', $data->dentist ?? null);
            $stmt->bindValue(':paymentType', $data->paymentType ?? 'full');
            $stmt->bindValue(':amountPaid', $data->amountPaid ?? 0);
            $stmt->bindValue(':remainingBalance', $data->remainingBalance ?? 0);
            $stmt->bindValue(':installmentPlan', isset($data->installmentPlan) ? json_encode($data->installmentPlan) : null);
            $stmt->bindValue(':id', $id);
            
            if ($stmt->execute()) {
                echo json_encode(["success" => true]);
            } else {
                throw new Exception("Failed to update treatment record");
            }
        } elseif ($method === 'DELETE') {
            $db->prepare("DELETE FROM treatmentrecords WHERE id = ?")->execute([$id]);
            echo json_encode(["success" => true]);
        }
    }
    elseif ($m = matches('api/treatment-records/patient/(\d+)', $path)) {
        $patientId = $m[1];
        $stmt = $db->prepare("SELECT * FROM treatmentrecords WHERE patientId = ? ORDER BY date DESC, createdAt DESC");
        $stmt->execute([$patientId]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($results as &$r) {
            if ($r['installmentPlan']) $r['installmentPlan'] = json_decode($r['installmentPlan']);
        }
        echo json_encode($results);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
