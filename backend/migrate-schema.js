const pool = require('./config/database');
const fs = require('fs');

async function migrateDatabase() {
  const connection = await pool.getConnection();
  try {
    console.log('Starting database migration...');

    // Check if treatmentRecords table has all required columns
    const [columns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'treatmentRecords' AND TABLE_SCHEMA = 'dental_clinic'"
    );

    const columnNames = columns.map(col => col.COLUMN_NAME);
    
    // Add missing columns to treatmentRecords if needed
    if (!columnNames.includes('paymentType')) {
      console.log('Adding paymentType column to treatmentRecords...');
      await connection.execute(
        "ALTER TABLE treatmentRecords ADD COLUMN paymentType ENUM('full', 'installment') DEFAULT 'full'"
      );
    }

    if (!columnNames.includes('amountPaid')) {
      console.log('Adding amountPaid column to treatmentRecords...');
      await connection.execute(
        "ALTER TABLE treatmentRecords ADD COLUMN amountPaid DECIMAL(10, 2) DEFAULT 0"
      );
    }

    if (!columnNames.includes('remainingBalance')) {
      console.log('Adding remainingBalance column to treatmentRecords...');
      await connection.execute(
        "ALTER TABLE treatmentRecords ADD COLUMN remainingBalance DECIMAL(10, 2) DEFAULT 0"
      );
    }

    if (!columnNames.includes('installmentPlan')) {
      console.log('Adding installmentPlan column to treatmentRecords...');
      await connection.execute(
        "ALTER TABLE treatmentRecords ADD COLUMN installmentPlan JSON"
      );
    }

    // Check if patients table has totalBalance column
    const [patientColumns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'patients' AND TABLE_SCHEMA = 'dental_clinic'"
    );

    const patientColumnNames = patientColumns.map(col => col.COLUMN_NAME);

    if (!patientColumnNames.includes('totalBalance')) {
      console.log('Adding totalBalance column to patients...');
      await connection.execute(
        "ALTER TABLE patients ADD COLUMN totalBalance DECIMAL(10, 2) DEFAULT 0"
      );
    }

    // Check if appointments table has createdByRole column
    const [appointmentColumns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'appointments' AND TABLE_SCHEMA = 'dental_clinic'"
    );

    const appointmentColumnNames = appointmentColumns.map(col => col.COLUMN_NAME);

    if (!appointmentColumnNames.includes('createdByRole')) {
      console.log('Adding createdByRole column to appointments...');
      await connection.execute(
        "ALTER TABLE appointments ADD COLUMN createdByRole ENUM('patient', 'staff') DEFAULT 'staff'"
      );
    }

    // Check if referrals table has createdByRole column
    const [referralColumns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'referrals' AND TABLE_SCHEMA = 'dental_clinic'"
    );

    const referralColumnNames = referralColumns.map(col => col.COLUMN_NAME);

    if (!referralColumnNames.includes('createdByRole')) {
      console.log('Adding createdByRole column to referrals...');
      await connection.execute(
        "ALTER TABLE referrals ADD COLUMN createdByRole ENUM('patient', 'staff') DEFAULT 'staff'"
      );
    }

    // Check if payments table exists
    const [tables] = await connection.query(
      "SHOW TABLES WHERE `Tables_in_dental_clinic` = 'payments'"
    );

    if (tables.length === 0) {
      console.log('Creating payments table...');
      await connection.execute(`
        CREATE TABLE payments (
          id INT PRIMARY KEY AUTO_INCREMENT,
          patientId INT NOT NULL,
          treatmentRecordId INT,
          amount DECIMAL(10, 2) NOT NULL,
          paymentDate DATE NOT NULL,
          paymentMethod ENUM('cash', 'card', 'check', 'bank_transfer') NOT NULL,
          status ENUM('paid', 'pending', 'overdue') DEFAULT 'pending',
          notes TEXT CHARACTER SET utf8mb4,
          recordedBy VARCHAR(100) CHARACTER SET utf8mb4,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
          FOREIGN KEY (treatmentRecordId) REFERENCES treatmentRecords(id) ON DELETE SET NULL
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
    }

    // Sanitize numeric columns in treatmentRecords (handle existing NULLs)
    console.log('Sanitizing treatmentRecords numeric fields (cost, amountPaid, remainingBalance)');
    try {
      await connection.execute("UPDATE treatmentRecords SET cost = 0 WHERE cost IS NULL");
      await connection.execute("UPDATE treatmentRecords SET amountPaid = 0 WHERE amountPaid IS NULL");
      await connection.execute("UPDATE treatmentRecords SET remainingBalance = 0 WHERE remainingBalance IS NULL");

      console.log('Altering treatmentRecords numeric columns to NOT NULL DEFAULT 0');
      await connection.execute("ALTER TABLE treatmentRecords MODIFY COLUMN cost DECIMAL(10,2) NOT NULL DEFAULT 0");
      await connection.execute("ALTER TABLE treatmentRecords MODIFY COLUMN amountPaid DECIMAL(10,2) NOT NULL DEFAULT 0");
      await connection.execute("ALTER TABLE treatmentRecords MODIFY COLUMN remainingBalance DECIMAL(10,2) NOT NULL DEFAULT 0");
    } catch (err) {
      console.warn('Sanitization/alter for treatmentRecords encountered an issue (continuing):', err.message);
    }

    // Set correct character set for critical tables
    console.log('Setting character set for tables...');
    await connection.execute("ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    await connection.execute("ALTER TABLE employees CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    await connection.execute("ALTER TABLE patients CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    await connection.execute("ALTER TABLE treatmentRecords CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    await connection.execute("ALTER TABLE announcements CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

    console.log('✓ Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  } finally {
    connection.release();
  }
}

migrateDatabase();
