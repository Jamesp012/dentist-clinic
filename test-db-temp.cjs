const pool = require('./backend/config/database');
pool.query('SELECT 1').then(([rows]) => {
  console.log('Database connection successful');
  return pool.query('SHOW TABLES');
}).then(([rows]) => {
  console.log('Tables in database:', rows.map(r => Object.values(r)[0]));
  process.exit(0);
}).catch(err => {
  console.error('Database connection failed:', err.message);
  process.exit(1);
});
