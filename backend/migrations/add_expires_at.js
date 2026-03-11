const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dental_clinic',
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    console.log('🔧 Running migration: Adding expiresAt column...');
    
    // Add expiresAt to announcements
    try {
      await connection.query('ALTER TABLE announcements ADD COLUMN expiresAt DATETIME NULL');
      console.log('   ✅ Added expiresAt to announcements table');
    } catch (err) {
      if (err.code === 'ER_DUP_COLUMN_NAME') {
        console.log('   ℹ expiresAt already exists in announcements table');
      } else {
        throw err;
      }
    }

    // Add expiresAt to patient_notifications
    try {
      await connection.query('ALTER TABLE patient_notifications ADD COLUMN expiresAt DATETIME NULL');
      console.log('   ✅ Added expiresAt to patient_notifications table');
    } catch (err) {
      if (err.code === 'ER_DUP_COLUMN_NAME') {
        console.log('   ℹ expiresAt already exists in patient_notifications table');
      } else {
        throw err;
      }
    }

    console.log('\n🚀 Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

migrate();
