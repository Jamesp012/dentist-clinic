const mysql = require('mysql2/promise');

(async () => {
  try {
    console.log('Testing direct connection...');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'dental_clinic'
    });
    
    console.log('✓ Connected!');
    
    const [users] = await connection.query('SELECT username, fullName FROM users WHERE username = "doctor"');
    console.log('Doctor user:', users);
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  }
})();
