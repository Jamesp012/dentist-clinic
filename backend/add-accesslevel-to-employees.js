const mysql = require('mysql2/promise');
require('dotenv').config();

async function addAccessLevelColumn() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dental_clinic',
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    console.log('Adding accessLevel column to employees table...');
    await connection.query(`
      ALTER TABLE employees 
      ADD COLUMN accessLevel ENUM('Admin', 'Super Admin', 'Default Accounts') DEFAULT 'Default Accounts'
    `);
    console.log('✓ accessLevel column added successfully');
    
    // Verify
    const [columns] = await connection.query('DESCRIBE employees');
    const accessLevelExists = columns.some(col => col.Field === 'accessLevel');
    if (accessLevelExists) {
      console.log('✓ Column verified in table structure');
    }
  } catch (error) {
    if (error.message.includes('Duplicate column')) {
      console.log('✓ Column already exists');
    } else {
      console.error('Error:', error.message);
    }
  } finally {
    await connection.end();
    process.exit(0);
  }
}

addAccessLevelColumn();
