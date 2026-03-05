const pool = require('./config/database');

async function checkTime() {
  try {
    const [rows] = await pool.query('SELECT NOW() as db_now, UTC_TIMESTAMP() as db_utc');
    console.log('System Time (Node):', new Date().toString());
    console.log('System UTC (Node):', new Date().toISOString());
    console.log('Database NOW:', rows[0].db_now);
    console.log('Database UTC:', rows[0].db_utc);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkTime();
