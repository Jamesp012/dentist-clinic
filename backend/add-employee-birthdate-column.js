const mysql = require('mysql2/promise');
require('dotenv').config();

async function addEmployeeBirthdateColumn() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dental_clinic',
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    const [columns] = await connection.query("SHOW COLUMNS FROM employees LIKE 'dateOfBirth'");
    if (columns.length > 0) {
      console.log('✓ dateOfBirth column already exists in employees table');
      return;
    }

    console.log('Adding dateOfBirth column to employees table...');
    await connection.query(`
      ALTER TABLE employees
      ADD COLUMN dateOfBirth DATE AFTER address
    `);
    console.log('✓ dateOfBirth column added successfully');
  } catch (error) {
    console.error('Error adding dateOfBirth column:', error.message);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

addEmployeeBirthdateColumn();
