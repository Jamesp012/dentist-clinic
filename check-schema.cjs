const pool = require('./backend/config/database');
async function checkSchema() {
  try {
    console.log('--- users table ---');
    const [userCols] = await pool.query('DESCRIBE users');
    console.table(userCols);
    
    console.log('--- employees table ---');
    const [empCols] = await pool.query('DESCRIBE employees');
    console.table(empCols);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
checkSchema();
