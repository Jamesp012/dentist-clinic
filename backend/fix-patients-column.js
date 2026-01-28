const pool = require('./config/database');
require('dotenv').config();

async function ensureHasAccountColumn() {
  const dbName = process.env.DB_NAME || 'dental_clinic';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = Number(process.env.DB_PORT) || 3306;
  console.log(`Connecting to MySQL ${dbHost}:${dbPort}, database ${dbName}...`);
  try {
    const [rows] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'has_account'`,
      [dbName]
    );

    if (rows.length > 0) {
      console.log('has_account column already exists on patients table. No changes made.');
      return;
    }

    await pool.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS has_account BOOLEAN DEFAULT FALSE`);
    console.log('Added has_account column to patients table.');
  } catch (err) {
    console.error('Failed to ensure has_account column:', err && err.message ? err.message : err);
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

ensureHasAccountColumn();
