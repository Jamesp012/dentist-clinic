const pool = require('./config/database');

async function completeMigration() {
  const connection = await pool.getConnection();
  try {
    console.log('Starting complete database migration...\n');

    // Check existing tables
    const [existingTables] = await connection.query(
      "SHOW TABLES"
    );
    const tableNames = existingTables.map(t => Object.values(t)[0].toLowerCase());
    console.log('Existing tables:', tableNames.join(', '), '\n');

    // 1. Create employees table if missing
    if (!tableNames.includes('employees')) {
      console.log('Creating employees table...');
      await connection.execute(`
        CREATE TABLE employees (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT UNIQUE,
          name VARCHAR(100) NOT NULL,
          position ENUM('dentist', 'assistant_dentist', 'assistant') NOT NULL,
          phone VARCHAR(20),
          email VARCHAR(100),
          address TEXT,
          dateHired DATE,
          generatedCode VARCHAR(100) UNIQUE,
          isCodeUsed BOOLEAN DEFAULT FALSE,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log('✓ Employees table created');
    }

    // 2. Create payments table if missing
    if (!tableNames.includes('payments')) {
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
          notes TEXT,
          recordedBy VARCHAR(100),
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
          FOREIGN KEY (treatmentRecordId) REFERENCES treatmentrecords(id) ON DELETE SET NULL
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log('✓ Payments table created');
    }

    // 3. Create otp_verifications table if missing
    if (!tableNames.includes('otp_verifications')) {
      console.log('Creating otp_verifications table...');
      await connection.execute(`
        CREATE TABLE otp_verifications (
          id INT PRIMARY KEY AUTO_INCREMENT,
          phone VARCHAR(20) NOT NULL,
          otp VARCHAR(6) NOT NULL,
          expiresAt TIMESTAMP NOT NULL,
          verified BOOLEAN DEFAULT FALSE,
          patientId INT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
          INDEX idx_phone_otp (phone, otp),
          INDEX idx_expires (expiresAt)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log('✓ OTP verifications table created');
    }

    // 4. Create prescriptions table if missing
    if (!tableNames.includes('prescriptions')) {
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
      console.log('✓ Prescriptions table created');
    }

    // 5. Add missing columns to users table
    console.log('\nChecking users table columns...');
    const [userColumns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND TABLE_SCHEMA = 'dental_clinic'"
    );
    const userColumnNames = userColumns.map(col => col.COLUMN_NAME);

    if (!userColumnNames.includes('position')) {
      console.log('Adding position column to users...');
      await connection.execute(
        "ALTER TABLE users ADD COLUMN position ENUM('dentist', 'assistant_dentist', 'assistant') DEFAULT NULL"
      );
    }

    if (!userColumnNames.includes('isFirstLogin')) {
      console.log('Adding isFirstLogin column to users...');
      await connection.execute(
        "ALTER TABLE users ADD COLUMN isFirstLogin BOOLEAN DEFAULT TRUE"
      );
    }

    if (!userColumnNames.includes('accountStatus')) {
      console.log('Adding accountStatus column to users...');
      await connection.execute(
        "ALTER TABLE users ADD COLUMN accountStatus ENUM('pending', 'active', 'inactive') DEFAULT 'active'"
      );
    }

    // 5. Add missing columns to patients table
    console.log('\nChecking patients table columns...');
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

    if (!patientColumnNames.includes('has_account')) {
      console.log('Adding has_account column to patients...');
      await connection.execute(
        "ALTER TABLE patients ADD COLUMN has_account BOOLEAN DEFAULT FALSE"
      );
    }

    // 6. Add missing columns to treatmentRecords table
    console.log('\nChecking treatmentRecords table columns...');
    const [treatmentColumns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'treatmentrecords' AND TABLE_SCHEMA = 'dental_clinic'"
    );
    const treatmentColumnNames = treatmentColumns.map(col => col.COLUMN_NAME);

    if (!treatmentColumnNames.includes('paymentType')) {
      console.log('Adding paymentType column to treatmentRecords...');
      await connection.execute(
        "ALTER TABLE treatmentrecords ADD COLUMN paymentType ENUM('full', 'installment') DEFAULT 'full'"
      );
    }

    if (!treatmentColumnNames.includes('amountPaid')) {
      console.log('Adding amountPaid column to treatmentRecords...');
      await connection.execute(
        "ALTER TABLE treatmentrecords ADD COLUMN amountPaid DECIMAL(10, 2) DEFAULT 0"
      );
    }

    if (!treatmentColumnNames.includes('remainingBalance')) {
      console.log('Adding remainingBalance column to treatmentRecords...');
      await connection.execute(
        "ALTER TABLE treatmentrecords ADD COLUMN remainingBalance DECIMAL(10, 2) DEFAULT 0"
      );
    }

    if (!treatmentColumnNames.includes('installmentPlan')) {
      console.log('Adding installmentPlan column to treatmentRecords...');
      await connection.execute(
        "ALTER TABLE treatmentrecords ADD COLUMN installmentPlan JSON"
      );
    }

    // 7. Add missing columns to appointments table
    console.log('\nChecking appointments table columns...');
    const [appointmentColumns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'appointments' AND TABLE_SCHEMA = 'dental_clinic'"
    );
    const appointmentColumnNames = appointmentColumns.map(col => col.COLUMN_NAME);

    if (!appointmentColumnNames.includes('duration')) {
      console.log('Adding duration column to appointments...');
      await connection.execute(
        "ALTER TABLE appointments ADD COLUMN duration INT DEFAULT 60"
      );
    }

    // 8. Update character sets for all tables
    console.log('\nUpdating character sets to utf8mb4...');
    const tablesToUpdate = ['users', 'patients', 'appointments', 'treatmentrecords', 
                            'announcements', 'inventory', 'referrals', 'photos', 
                            'chatmessages', 'serviceprices'];
    
    for (const table of tablesToUpdate) {
      if (tableNames.includes(table)) {
        try {
          await connection.execute(
            `ALTER TABLE ${table} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
          );
          console.log(`✓ Updated ${table} character set`);
        } catch (err) {
          console.log(`⚠ ${table}: ${err.message}`);
        }
      }
    }

    console.log('\n✅ Complete database migration finished successfully!');
    console.log('\nYour database now includes:');
    console.log('- All required tables (users, patients, employees, payments, etc.)');
    console.log('- Payment tracking with installment support');
    console.log('- Patient account claiming with OTP verification');
    console.log('- Employee management system');
    console.log('- UTF-8 support for international characters');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    connection.release();
  }
}

completeMigration();
