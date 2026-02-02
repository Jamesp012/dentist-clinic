const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dental_clinic',
  charset: 'utf8mb4'
};

async function addReferralContactEmailColumns() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    console.log('Adding referredByContact column to referrals table...');
    await connection.execute(`
      ALTER TABLE referrals
      ADD COLUMN referredByContact VARCHAR(50) NULL AFTER referringDentist
    `);
    console.log('✓ Added referredByContact column');

    console.log('Adding referredByEmail column to referrals table...');
    await connection.execute(`
      ALTER TABLE referrals
      ADD COLUMN referredByEmail VARCHAR(120) NULL AFTER referredByContact
    `);
    console.log('✓ Added referredByEmail column');

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

addReferralContactEmailColumns();
