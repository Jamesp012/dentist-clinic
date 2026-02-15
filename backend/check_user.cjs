const pool = require('./config/database');

async function checkUser() {
  try {
    const [rows] = await pool.query('SELECT username, role, accessLevel FROM users WHERE username = ?', ['drjoseph']);
    console.log('USER_CHECK_RESULT:', JSON.stringify(rows[0]));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkUser();
