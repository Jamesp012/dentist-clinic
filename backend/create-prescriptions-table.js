const pool = require('./config/database');

async function createPrescriptionsTable() {
  const connection = await pool.getConnection();
  try {
    console.log('Starting prescriptions table migration...\n');

    // Check if prescriptions table exists
    const [tables] = await connection.query(
      "SHOW TABLES WHERE `Tables_in_dental_clinic` = 'prescriptions'"
    );

    if (tables.length === 0) {
      console.log('Creating prescriptions table...');
      await connection.execute(`
        CREATE TABLE prescriptions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          patientId INT NOT NULL,
          patientName VARCHAR(100) CHARACTER SET utf8mb4,
          dentist VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL,
          licenseNumber VARCHAR(50),
          ptrNumber VARCHAR(50),
          medications JSON NOT NULL,
          notes TEXT CHARACTER SET utf8mb4,
          date DATE NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
          INDEX idx_patient_id (patientId),
          INDEX idx_created_date (createdAt),
          INDEX idx_patient_date (patientId, createdAt)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log('✓ Prescriptions table created successfully\n');
    } else {
      console.log('✓ Prescriptions table already exists\n');
    }

    // Verify table was created
    const [columns] = await connection.query('DESCRIBE prescriptions');
    console.log('✓ Prescriptions table structure:');
    columns.forEach(col => {
      console.log(`  ${col.Field.padEnd(20)} | ${col.Type}`);
    });

    console.log('\n✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error during migration:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

createPrescriptionsTable();
