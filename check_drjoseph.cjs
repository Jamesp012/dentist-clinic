const pool = require('./backend/config/database');
async function checkUser() {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = "drjoseph"');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkUser();
