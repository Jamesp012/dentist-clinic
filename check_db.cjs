const pool = require('./backend/config/database');
async function check() {
  try {
    const [rows] = await pool.query('DESCRIBE otp_verifications');
    console.log(JSON.stringify(rows.map(r => r.Field)));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();