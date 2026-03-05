<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$payload = authorize();

$database = new Database();
$db = $database->getConnection();

try {
    if (!isset($_FILES['file'])) throw new Exception("No file uploaded");
    
    $targetDir = __DIR__ . "/../../uploads/referrals/";
    if (!file_exists($targetDir)) {
        if (!mkdir($targetDir, 0777, true)) {
            throw new Exception("Failed to create target directory: $targetDir");
        }
    }
    
    // Ensure the directory is writable
    if (!is_writable($targetDir)) {
        throw new Exception("Target directory is not writable: $targetDir");
    }
    
    $file = $_FILES['file'];
    $patientId = $_POST['patientId'] ?? null;
    $referralId = $_POST['referralId'] ?? null;
    $userId = $payload->id ?? null;

    $fileName = $file['name'];
    $extension = pathinfo($fileName, PATHINFO_EXTENSION);
    $uniqueName = 'file-' . time() . '-' . mt_rand(100000000, 999999999) . '.' . $extension;
    $targetPath = $targetDir . $uniqueName;
    
    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        $mime = $file['type'];
        $fileType = (strpos($mime, 'image/') === 0) ? 'image' : ($mime === 'application/pdf' ? 'pdf' : 'document');
        $fileSize = $file['size'];
        
        // Store a URL that is relative to the backend/php directory for PHP, 
        // or just /uploads/referrals/ for consistency with the Node.js backend.
        // The frontend getSafeFileUrl() utility will prepend the appropriate base URL.
        $publicUrl = "/uploads/referrals/" . $uniqueName;

        $query = "INSERT INTO referral_files (referralId, patientId, fileName, fileType, filePath, fileSize, uploadedBy, url) 
                  VALUES (:referralId, :patientId, :fileName, :fileType, :filePath, :fileSize, :uploadedBy, :url)";
        
        $stmt = $db->prepare($query);
        $stmt->bindValue(':referralId', $referralId);
        $stmt->bindValue(':patientId', $patientId);
        $stmt->bindValue(':fileName', $fileName);
        $stmt->bindValue(':fileType', $fileType);
        $stmt->bindValue(':filePath', $targetPath);
        $stmt->bindValue(':fileSize', $fileSize);
        $stmt->bindValue(':uploadedBy', $userId);
        $stmt->bindValue(':url', $publicUrl);

        if ($stmt->execute()) {
            $lastId = $db->lastInsertId();
            echo json_encode([
                "success" => true,
                "id" => (int)$lastId,
                "url" => $publicUrl,
                "fileName" => $fileName
            ]);
        } else {
            $errorInfo = $stmt->errorInfo();
            throw new Exception("Failed to save file info to database: " . $errorInfo[2]);
        }
    } else {
        throw new Exception("Failed to move uploaded file");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
