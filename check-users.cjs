const pool = require('./backend/config/database');
pool.query('SELECT id, username, fullName, role, accessLevel, accountStatus FROM users').then(([rows]) => {
  console.log('Users in database:');
  console.table(rows);
  process.exit(0);
}).catch(err => {
  console.error('Error fetching users:', err.message);
  process.exit(1);
});
