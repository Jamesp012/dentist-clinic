const pool = require('./config/database');
const bcryptjs = require('bcryptjs');

async function createTestUser() {
  try {
    const username = 'testuser';
    const password = 'password123';
    const fullName = 'Test User';
    const email = 'test@example.com';
    const role = 'doctor';
    const phone = '+63-000-000-0000';

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Delete existing test user if any
    await pool.query('DELETE FROM employees WHERE user_id IN (SELECT id FROM users WHERE username = ?)', [username]);
    await pool.query('DELETE FROM users WHERE username = ?', [username]);

    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (username, password, fullName, email, role, phone, position, isFirstLogin, accountStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, fullName, email, role, phone, 'dentist', false, 'active']
    );

    // Create employee record
    await pool.query(
      'INSERT INTO employees (user_id, name, position, phone, email, address, dateHired, isCodeUsed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [result.insertId, fullName, 'dentist', phone, email, 'Test Address', '2024-01-01', true]
    );

    console.log(`Test user created successfully!`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log(`Role: ${role}`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    await pool.end();
    process.exit(1);
  }
}

createTestUser();
