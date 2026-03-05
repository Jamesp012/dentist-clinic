<?php
// backend/php/api/dental_charts.php
require_once __DIR__ . '/../config/database.php';

$database = new Database();
$db = $database->getConnection();

// Ensure table exists and has correct structure
function ensureTable($db) {
    try {
        // Check if table exists
        $stmt = $db->query("SHOW TABLES LIKE 'dental_charts'");
        $exists = $stmt->rowCount() > 0;
        
        if (!$exists) {
            $createSql = "
                CREATE TABLE dental_charts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    chart_id VARCHAR(100) NOT NULL,
                    patient_id VARCHAR(100) NOT NULL,
                    chart_date VARCHAR(100) NOT NULL,
                    chart_data LONGTEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY ux_patient_chart (patient_id, chart_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ";
            $db->exec($createSql);
        } else {
            // Ensure columns are correct
            $db->exec("ALTER TABLE dental_charts MODIFY COLUMN patient_id VARCHAR(100) NOT NULL");
            $db->exec("ALTER TABLE dental_charts MODIFY COLUMN chart_id VARCHAR(100) NOT NULL");
            $db->exec("ALTER TABLE dental_charts MODIFY COLUMN chart_date VARCHAR(100) NOT NULL");
            $db->exec("ALTER TABLE dental_charts MODIFY COLUMN chart_data LONGTEXT NOT NULL");
            
            // Check for unique key
            $stmt = $db->query("SHOW INDEX FROM dental_charts WHERE Key_name = 'ux_patient_chart'");
            if ($stmt->rowCount() === 0) {
                $db->exec("ALTER TABLE dental_charts ADD UNIQUE KEY ux_patient_chart (patient_id, chart_id)");
            }
        }
    } catch (PDOException $e) {
        // Log error but don't stop execution
        error_log("Error in dental_charts ensureTable: " . $e->getMessage());
    }
}

$method = $_SERVER['REQUEST_METHOD'];
ensureTable($db);

if ($method === 'GET' && isset($_GET['patientId'])) {
    $patientId = $_GET['patientId'];
    try {
        $query = "SELECT chart_id as id, chart_date as date, patient_id as patientId, chart_data as data FROM dental_charts WHERE patient_id = :patient_id ORDER BY created_at ASC";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':patient_id', $patientId);
        $stmt->execute();
        $charts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Decode data JSON
        foreach ($charts as &$chart) {
            if (is_string($chart['data'])) {
                $chart['data'] = json_decode($chart['data'], true);
            }
        }
        
        echo json_encode($charts);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['patientId']) || !isset($data['id']) || !isset($data['data'])) {
        http_response_code(400);
        echo json_encode(["error" => "Incomplete data"]);
        exit();
    }
    
    try {
        $query = "INSERT INTO dental_charts (patient_id, chart_id, chart_date, chart_data) 
                  VALUES (:patient_id, :chart_id, :chart_date, :chart_data)
                  ON DUPLICATE KEY UPDATE chart_data = :chart_data, chart_date = :chart_date";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':patient_id', $data['patientId']);
        $stmt->bindParam(':chart_id', $data['id']);
        $stmt->bindParam(':chart_date', $data['date']);
        $chartDataJson = json_encode($data['data']);
        $stmt->bindParam(':chart_data', $chartDataJson);
        
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Chart saved"]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to save chart"]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
    exit();
}

if ($method === 'DELETE' && isset($_GET['id']) && isset($_GET['patientId'])) {
    $chartId = $_GET['id'];
    $patientId = $_GET['patientId'];
    
    try {
        $query = "DELETE FROM dental_charts WHERE patient_id = :patient_id AND chart_id = :chart_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':patient_id', $patientId);
        $stmt->bindParam(':chart_id', $chartId);
        
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Chart deleted"]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to delete chart"]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
    exit();
}
?>
