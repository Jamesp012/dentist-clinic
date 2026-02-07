const pool = require('../config/database');

async function sanitize() {
  const connection = await pool.getConnection();
  try {
    console.log('Sanitizing treatmentRecords numeric fields...');

    const [costRes] = await connection.query("UPDATE treatmentRecords SET cost = 0 WHERE cost IS NULL");
    console.log(`Updated cost NULLs -> 0 (affectedRows: ${costRes.affectedRows})`);

    const [paidRes] = await connection.query("UPDATE treatmentRecords SET amountPaid = 0 WHERE amountPaid IS NULL");
    console.log(`Updated amountPaid NULLs -> 0 (affectedRows: ${paidRes.affectedRows})`);

    const [remRes] = await connection.query("UPDATE treatmentRecords SET remainingBalance = 0 WHERE remainingBalance IS NULL");
    console.log(`Updated remainingBalance NULLs -> 0 (affectedRows: ${remRes.affectedRows})`);

    console.log('Sanitization complete.');
    process.exit(0);
  } catch (err) {
    console.error('Sanitization failed:', err.message);
    process.exit(1);
  } finally {
    connection.release();
  }
}

sanitize();
