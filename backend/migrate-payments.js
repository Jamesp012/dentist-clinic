const pool = require('./config/database');

(async () => {
  const connection = await pool.getConnection();
  try {
    console.log('Starting enhanced database migration...');

    // 1. Update patients table to include totalBalance
    console.log('Updating patients table...');
    const [patientColumns] = await connection.query('DESCRIBE patients');
    const patientColumnNames = patientColumns.map(c => c.Field);

    if (!patientColumnNames.includes('totalBalance')) {
      await connection.query("ALTER TABLE patients ADD COLUMN totalBalance DECIMAL(10, 2) DEFAULT 0.00 AFTER has_account");
      console.log('✓ Added totalBalance column to patients');
    }

    // 2. Update treatmentRecords table to include payment fields
    console.log('Updating treatmentRecords table...');
    const [trColumns] = await connection.query('DESCRIBE treatmentRecords');
    const trColumnNames = trColumns.map(c => c.Field);

    if (!trColumnNames.includes('paymentType')) {
      await connection.query("ALTER TABLE treatmentRecords ADD COLUMN paymentType ENUM('full', 'installment') DEFAULT 'full' AFTER dentist");
      console.log('✓ Added paymentType column to treatmentRecords');
    }

    if (!trColumnNames.includes('amountPaid')) {
      await connection.query("ALTER TABLE treatmentRecords ADD COLUMN amountPaid DECIMAL(10, 2) DEFAULT 0.00 AFTER paymentType");
      console.log('✓ Added amountPaid column to treatmentRecords');
    }

    if (!trColumnNames.includes('remainingBalance')) {
      await connection.query("ALTER TABLE treatmentRecords ADD COLUMN remainingBalance DECIMAL(10, 2) DEFAULT 0.00 AFTER amountPaid");
      console.log('✓ Added remainingBalance column to treatmentRecords');
    }

    if (!trColumnNames.includes('installmentPlan')) {
      await connection.query("ALTER TABLE treatmentRecords ADD COLUMN installmentPlan JSON DEFAULT NULL AFTER remainingBalance");
      console.log('✓ Added installmentPlan column to treatmentRecords');
    }

    // 3. Create payments table if it doesn't exist
    console.log('Creating payments table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        patientId INT,
        treatmentRecordId INT,
        amount DECIMAL(10, 2) NOT NULL,
        paymentDate DATE NOT NULL,
        paymentMethod ENUM('cash', 'card', 'check', 'bank_transfer') NOT NULL,
        status ENUM('paid', 'pending', 'overdue') DEFAULT 'paid',
        notes TEXT,
        recordedBy VARCHAR(100),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (treatmentRecordId) REFERENCES treatmentRecords(id) ON DELETE SET NULL
      )
    `);
    console.log('✓ Payments table ready');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    connection.release();
  }
})();
