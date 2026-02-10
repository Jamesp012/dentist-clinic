const pool = require('./config/database');

async function checkFiles() {
  try {
    const [rows] = await pool.query('SELECT * FROM referral_files ORDER BY id DESC LIMIT 5');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkFiles();