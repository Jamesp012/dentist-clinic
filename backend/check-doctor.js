const pool = require('./config/database');

(async () => {
  try {
    const [users] = await pool.query('SELECT id, username, role, fullName FROM users WHERE username = ?', ['doctor']);
    console.log('Current doctor user:', users);
    
    if (users.length > 0) {
      console.log('\nDoctor exists in database');
      console.log('Try logging in with a different password, or the username was changed');
    } else {
      console.log('\nDoctor does NOT exist - needs to be created');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
})();
