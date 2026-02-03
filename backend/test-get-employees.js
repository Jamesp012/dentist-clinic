const pool = require('./config/database');

async function testGetEmployees() {
  try {
    const [employees] = await pool.query(`
      SELECT e.*, u.username, u.email as userEmail, u.isFirstLogin, u.accountStatus, u.accessLevel
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      ORDER BY e.createdAt DESC
    `);
    console.log('Employees data returned from DB:');
    console.log(JSON.stringify(employees, null, 2));
    console.log('\nTotal employees:', employees.length);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testGetEmployees();
