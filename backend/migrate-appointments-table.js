const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateAppointmentsTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'dental_clinic'
  });

  try {
    console.log('Starting appointments table migration...');

    // Check if the new appointmentDateTime column exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME = 'appointmentDateTime'
    `);

    if (columns.length > 0) {
      console.log('✓ appointmentDateTime column already exists. Migration skipped.');
      await connection.end();
      return;
    }

    // If old columns exist, migrate the data
    const [oldColumns] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME IN ('date', 'time')
    `);

    if (oldColumns.length > 0) {
      console.log('Migrating existing data...');
      
      // Add new column
      await connection.query(`
        ALTER TABLE appointments 
        ADD COLUMN appointmentDateTime DATETIME DEFAULT NULL
      `);
      console.log('✓ Added appointmentDateTime column');

      // Migrate existing data
      await connection.query(`
        UPDATE appointments 
        SET appointmentDateTime = CONCAT(DATE_FORMAT(date, '%Y-%m-%d'), ' ', TIME_FORMAT(time, '%H:%i:%s'))
        WHERE date IS NOT NULL AND time IS NOT NULL
      `);
      console.log('✓ Migrated existing appointment data');

      // Make appointmentDateTime NOT NULL
      await connection.query(`
        ALTER TABLE appointments 
        MODIFY COLUMN appointmentDateTime DATETIME NOT NULL
      `);
      console.log('✓ Set appointmentDateTime as NOT NULL');

      // Add indexes
      await connection.query(`
        CREATE INDEX idx_patient_date ON appointments (patientId, appointmentDateTime)
      `).catch(err => {
        if (!err.message.includes('Duplicate key name')) throw err;
        console.log('✓ Index idx_patient_date already exists');
      });

      await connection.query(`
        CREATE INDEX idx_status ON appointments (status)
      `).catch(err => {
        if (!err.message.includes('Duplicate key name')) throw err;
        console.log('✓ Index idx_status already exists');
      });

      // Drop old columns
      await connection.query(`
        ALTER TABLE appointments 
        DROP COLUMN date, 
        DROP COLUMN time
      `);
      console.log('✓ Dropped old date and time columns');
    } else {
      console.log('No old date/time columns found. Creating table from scratch...');
      
      // Drop and recreate the table
      await connection.query('DROP TABLE IF EXISTS appointments');
      
      await connection.query(`
        CREATE TABLE appointments (
          id INT PRIMARY KEY AUTO_INCREMENT,
          patientId INT,
          patientName VARCHAR(100),
          appointmentDateTime DATETIME NOT NULL,
          type VARCHAR(100),
          duration INT DEFAULT 60,
          status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
          notes TEXT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE SET NULL,
          INDEX idx_patient_date (patientId, appointmentDateTime),
          INDEX idx_status (status)
        )
      `);
      console.log('✓ Recreated appointments table with new schema');
    }

    console.log('\n✓ Appointments table migration completed successfully!');

  } catch (error) {
    console.error('Error migrating appointments table:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrateAppointmentsTable();
