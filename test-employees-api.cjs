const pool = require('./backend/config/database');

async function testEmployeesAPI() {
  try {
    console.log('Testing employees API query...');
    const [employees] = await pool.query(`
      SELECT e.*, u.username, u.email as userEmail, u.isFirstLogin, u.accountStatus, u.accessLevel
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      ORDER BY e.createdAt DESC
    `);
    console.log('Query returned:', employees.length, 'employees');
    console.log(JSON.stringify(employees, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testEmployeesAPI();
