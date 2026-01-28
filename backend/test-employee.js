const pool = require('./config/database');

async function testAddEmployee() {
  try {
    const name = 'Test Employee';
    const position = 'dentist';
    const phone = '+63 912 345 6789';
    const email = 'test@example.com';
    const address = 'Test Address';
    const dateHired = '2024-01-19';

    console.log('Testing employee insert with values:');
    console.log({ name, position, phone, email, address, dateHired });

    const [result] = await pool.query(
      'INSERT INTO employees (name, position, phone, email, address, dateHired) VALUES (?, ?, ?, ?, ?, ?)',
      [name, position, phone, email, address, dateHired]
    );

    console.log('SUCCESS! Result:', result);
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testAddEmployee();
