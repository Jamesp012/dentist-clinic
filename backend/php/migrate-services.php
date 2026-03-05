<?php
// backend/php/migrate-services.php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    echo "Starting migration for serviceprices table...\n";
    
    // Check if table exists (case-insensitive)
    $stmt = $db->query("SHOW TABLES LIKE 'serviceprices'");
    $exists = $stmt->fetch();
    
    if (!$exists) {
        echo "Creating serviceprices table...\n";
        $db->exec("CREATE TABLE serviceprices (
            id INT PRIMARY KEY AUTO_INCREMENT,
            serviceName VARCHAR(150) CHARACTER SET utf8mb4,
            description TEXT CHARACTER SET utf8mb4,
            price VARCHAR(255) CHARACTER SET utf8mb4,
            category VARCHAR(50) CHARACTER SET utf8mb4,
            duration VARCHAR(50) CHARACTER SET utf8mb4,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        echo "Table created successfully.\n";
    } else {
        echo "Updating price column to VARCHAR in serviceprices table...\n";
        // Check if price is already VARCHAR
        $stmt = $db->query("DESCRIBE serviceprices");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $priceCol = null;
        foreach ($columns as $col) {
            if ($col['Field'] === 'price') {
                $priceCol = $col;
                break;
            }
        }
        
        if ($priceCol && strpos(strtolower($priceCol['Type']), 'varchar') === false) {
            $db->exec("ALTER TABLE serviceprices MODIFY COLUMN price VARCHAR(255) CHARACTER SET utf8mb4");
            echo "Column updated successfully.\n";
        } else {
            echo "Column is already VARCHAR or table name was wrong.\n";
        }
    }
    
    echo "Migration completed successfully.";
} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage();
}
?>
