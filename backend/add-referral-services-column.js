const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dental_clinic',
  charset: 'utf8mb4'
};

async function addServicesColumn() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    console.log('Adding selectedServices column to referrals table...');
    await connection.execute(`
      ALTER TABLE referrals 
      ADD COLUMN selectedServices JSON NULL AFTER reason
    `);
    console.log('✓ Added selectedServices column');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addServicesColumn();
