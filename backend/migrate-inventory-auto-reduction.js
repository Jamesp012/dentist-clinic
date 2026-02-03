/**
 * Migration script to add inventory auto-reduction tables
 * Creates tables for inventory auto-reduction rules and reduction history
 */

const pool = require('./config/database');

async function migrate() {
  try {
    console.log('Starting inventory auto-reduction migration...');

    // Check if the table already exists
    const [tables] = await pool.query(
      "SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'dental_clinic' AND TABLE_NAME = 'inventory_auto_reduction_rules'"
    );

    if (tables[0].count > 0) {
      console.log('inventory_auto_reduction_rules table already exists. Skipping migration.');
      return;
    }

    // Create inventory_auto_reduction_rules table
    console.log('Creating inventory_auto_reduction_rules table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_auto_reduction_rules (
        id INT PRIMARY KEY AUTO_INCREMENT,
        appointmentType VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL,
        inventoryItemId INT NOT NULL,
        quantityToReduce INT NOT NULL DEFAULT 1,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (inventoryItemId) REFERENCES inventory(id) ON DELETE CASCADE,
        INDEX idx_appointment_type (appointmentType),
        INDEX idx_item_id (inventoryItemId),
        UNIQUE KEY uk_type_item (appointmentType, inventoryItemId)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('✓ inventory_auto_reduction_rules table created');

    // Create inventory_reduction_history table
    console.log('Creating inventory_reduction_history table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_reduction_history (
        id INT PRIMARY KEY AUTO_INCREMENT,
        appointmentId INT NOT NULL,
        patientId INT NOT NULL,
        patientName VARCHAR(100) CHARACTER SET utf8mb4,
        appointmentType VARCHAR(100) CHARACTER SET utf8mb4,
        inventoryItemId INT NOT NULL,
        inventoryItemName VARCHAR(150) CHARACTER SET utf8mb4,
        quantityReduced INT NOT NULL,
        quantityBefore INT NOT NULL,
        quantityAfter INT NOT NULL,
        reducedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE CASCADE,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (inventoryItemId) REFERENCES inventory(id) ON DELETE CASCADE,
        INDEX idx_appointment_id (appointmentId),
        INDEX idx_patient_id (patientId),
        INDEX idx_reduced_date (reducedAt),
        INDEX idx_item_id (inventoryItemId)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('✓ inventory_reduction_history table created');

    console.log('\n✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
