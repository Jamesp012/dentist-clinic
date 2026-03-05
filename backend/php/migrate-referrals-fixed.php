<?php
// backend/php/migrate-referrals-fixed.php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

$queries = [
    "ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referringDentist VARCHAR(100) AFTER patientName",
    "ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referredByContact VARCHAR(50) AFTER referringDentist",
    "ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referredByEmail VARCHAR(120) AFTER referredByContact",
    "ALTER TABLE referrals ADD COLUMN IF NOT EXISTS selectedServices JSON AFTER reason",
    "ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referralType ENUM('incoming', 'outgoing') DEFAULT 'outgoing' AFTER createdByRole",
    "ALTER TABLE referrals ADD COLUMN IF NOT EXISTS source ENUM('patient-uploaded', 'staff-upload', 'external') DEFAULT 'staff-upload' AFTER referralType",
    "ALTER TABLE referrals ADD COLUMN IF NOT EXISTS xrayDiagramSelections JSON AFTER source",
    "ALTER TABLE referrals ADD COLUMN IF NOT EXISTS xrayNotes TEXT AFTER xrayDiagramSelections"
];

echo "Starting migration...<br>";

foreach ($queries as $query) {
    try {
        $db->exec($query);
        echo "Successfully executed: $query<br>";
    } catch (PDOException $e) {
        // Column already exists might throw error in some versions even with IF NOT EXISTS
        echo "Notice/Error on query ($query): " . $e->getMessage() . "<br>";
    }
}

echo "Migration finished.";
?>
