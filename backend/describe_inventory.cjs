const pool = require('./config/database');
async function run() {
  const [rows] = await pool.query('SELECT * FROM inventory LIMIT 1');
  console.log(JSON.stringify(rows[0], null, 2));
  process.exit(0);
}
run();
