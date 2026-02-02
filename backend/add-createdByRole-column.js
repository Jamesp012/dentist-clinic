const mysql = require('mysql2/promise');
require('dotenv').config();

async function addCreatedByRoleColumn() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'dental_clinic'
  });

  try {
    console.log('Checking appointments table structure...');
    
    // Check if column exists
    const [columns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dental_clinic' AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'createdByRole'"
    );
    
    if (columns.length > 0) {
      console.log('✓ createdByRole column already exists');
    } else {
      console.log('Adding createdByRole column to appointments table...');
      await connection.query(
        "ALTER TABLE appointments ADD COLUMN createdByRole ENUM('patient', 'staff') DEFAULT 'staff' AFTER notes"
      );
      console.log('✓ createdByRole column added successfully');
    }
    
    // Show updated structure
    const [cols] = await connection.query('DESCRIBE appointments');
    console.log('\nAppointments table structure:');
    cols.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

addCreatedByRoleColumn();
