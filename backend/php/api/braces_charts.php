<?php
// backend/php/api/braces_charts.php
require_once __DIR__ . '/../config/database.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET' && isset($_GET['patientId'])) {
    $patientId = $_GET['patientId'];
    try {
        // Fetch snapshots
        $query_snapshots = "SELECT * FROM braces_charts WHERE patient_id = :patient_id ORDER BY timestamp DESC";
        $stmt_snapshots = $db->prepare($query_snapshots);
        $stmt_snapshots->bindParam(':patient_id', $patientId);
        $stmt_snapshots->execute();
        $snapshots = $stmt_snapshots->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($snapshots as &$snapshot) {
            $snapshot['bracketColors'] = json_decode($snapshot['bracket_colors'], true);
            $snapshot['bracketVisibility'] = json_decode($snapshot['bracket_visibility'], true);
            unset($snapshot['bracket_colors']);
            unset($snapshot['bracket_visibility']);
        }
        
        // Fetch history
        $query_history = "SELECT * FROM braces_history WHERE patient_id = :patient_id ORDER BY date DESC";
        $stmt_history = $db->prepare($query_history);
        $stmt_history->bindParam(':patient_id', $patientId);
        $stmt_history->execute();
        $history = $stmt_history->fetchAll(PDO::FETCH_ASSOC);
        
        // Reformat history
        $formatted_history = array_map(function($entry) {
            return [
                'date' => $entry['date'],
                'colorName' => $entry['color_name'],
                'colorValue' => $entry['color_value'],
                'notes' => $entry['notes'],
                'toothNumber' => $entry['tooth_number']
            ];
        }, $history);
        
        echo json_encode([
            "chartSnapshots" => $snapshots,
            "colorHistory" => $formatted_history,
            "currentBracketVisibility" => !empty($snapshots) ? $snapshots[0]['bracketVisibility'] : null,
            "lastUpdated" => !empty($snapshots) ? $snapshots[0]['timestamp'] : null
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['patientId'])) {
        http_response_code(400);
        echo json_encode(["error" => "Patient ID required"]);
        exit();
    }
    
    $patientId = $data['patientId'];
    
    try {
        $db->beginTransaction();
        
        // 1. Handle snapshot
        if (isset($data['snapshot'])) {
            $snapshot = $data['snapshot'];
            $query_snapshot = "INSERT INTO braces_charts (patient_id, snapshot_id, timestamp, bracket_colors, bracket_visibility, notes)
                              VALUES (:patient_id, :snapshot_id, :timestamp, :bracket_colors, :bracket_visibility, :notes)
                              ON DUPLICATE KEY UPDATE bracket_colors = :bracket_colors, bracket_visibility = :bracket_visibility, notes = :notes";
            
            $stmt_snapshot = $db->prepare($query_snapshot);
            $stmt_snapshot->bindParam(':patient_id', $patientId);
            $stmt_snapshot->bindParam(':snapshot_id', $snapshot['id']);
            $stmt_snapshot->bindParam(':timestamp', $snapshot['timestamp']);
            $bracket_colors_json = json_encode($snapshot['bracketColors']);
            $stmt_snapshot->bindParam(':bracket_colors', $bracket_colors_json);
            $bracket_visibility_json = json_encode($snapshot['bracketVisibility']);
            $stmt_snapshot->bindParam(':bracket_visibility', $bracket_visibility_json);
            $stmt_snapshot->bindParam(':notes', $snapshot['notes']);
            $stmt_snapshot->execute();
        }
        
        // 2. Handle history entry
        if (isset($data['historyEntry'])) {
            $entry = $data['historyEntry'];
            $query_history = "INSERT INTO braces_history (patient_id, date, color_name, color_value, notes, tooth_number)
                              VALUES (:patient_id, :date, :color_name, :color_value, :notes, :tooth_number)";
            
            $stmt_history = $db->prepare($query_history);
            $stmt_history->bindParam(':patient_id', $patientId);
            $stmt_history->bindParam(':date', $entry['date']);
            $stmt_history->bindParam(':color_name', $entry['colorName']);
            $stmt_history->bindParam(':color_value', $entry['colorValue']);
            $stmt_history->bindParam(':notes', $entry['notes']);
            $stmt_history->bindParam(':tooth_number', $entry['toothNumber']);
            $stmt_history->execute();
        }
        
        $db->commit();
        echo json_encode(["success" => true, "message" => "Data saved"]);
        
    } catch (PDOException $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
    exit();
}

if ($method === 'DELETE' && isset($_GET['snapshotId']) && isset($_GET['patientId'])) {
    $snapshotId = $_GET['snapshotId'];
    $patientId = $_GET['patientId'];
    
    try {
        $db->beginTransaction();
        
        // Get snapshot timestamp to delete from history as well
        $q_get = "SELECT timestamp FROM braces_charts WHERE patient_id = :patient_id AND snapshot_id = :snapshot_id";
        $st_get = $db->prepare($q_get);
        $st_get->bindParam(':patient_id', $patientId);
        $st_get->bindParam(':snapshot_id', $snapshotId);
        $st_get->execute();
        $row = $st_get->fetch();
        
        if ($row) {
            $timestamp = $row['timestamp'];
            
            // Delete snapshot
            $q_del_snap = "DELETE FROM braces_charts WHERE patient_id = :patient_id AND snapshot_id = :snapshot_id";
            $st_del_snap = $db->prepare($q_del_snap);
            $st_del_snap->bindParam(':patient_id', $patientId);
            $st_del_snap->bindParam(':snapshot_id', $snapshotId);
            $st_del_snap->execute();
            
            // Delete from history
            $q_del_hist = "DELETE FROM braces_history WHERE patient_id = :patient_id AND date = :date";
            $st_del_hist = $db->prepare($q_del_hist);
            $st_del_hist->bindParam(':patient_id', $patientId);
            $st_del_hist->bindParam(':date', $timestamp);
            $st_del_hist->execute();
        }
        
        $db->commit();
        echo json_encode(["success" => true, "message" => "Snapshot deleted"]);
        
    } catch (PDOException $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
    exit();
}
?>
