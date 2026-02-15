const pool = require('./config/database');
const { sendPatientCredentials, transporter } = require('./utils/emailService');

async function test() {
  try {
    console.log('--- Testing Database Connection ---');
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    console.log('DB Connection OK, result:', rows[0].result);

    console.log('\n--- Checking Tables ---');
    const [tables] = await pool.query('SHOW TABLES');
    console.log('Tables:', tables.map(t => Object.values(t)[0]));

    console.log('\n--- Checking patients table structure ---');
    const [columns] = await pool.query('DESCRIBE patients');
    console.log('Patients columns:', columns.map(c => c.Field));

    console.log('\n--- Checking users table structure ---');
    const [userColumns] = await pool.query('DESCRIBE users');
    console.log('Users columns:', userColumns.map(c => c.Field));

    console.log('\n--- Testing Email Service ---');
    console.log('Verifying transporter...');
    try {
      await new Promise((resolve, reject) => {
        transporter.verify((error, success) => {
          if (error) {
            console.error('Email transporter error:', error);
            reject(error);
          } else {
            console.log('Email server is ready to take our messages');
            resolve(success);
          }
        });
      });
    } catch (e) {
      console.error('Transporter verification failed in test script');
    }
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    process.exit();
  }
}

test();
