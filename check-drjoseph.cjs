const pool = require('./backend/config/database');
pool.query('SELECT * FROM users WHERE username = ?', ['drjoseph']).then(([rows]) => {
  console.log('User drjoseph:');
  console.log(rows[0]);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
