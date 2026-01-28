const pool = require('./config/database');
const bcryptjs = require('bcryptjs');

async function createTestUsers() {
  try {
    const users = [
      {
        username: 'testdoctor',
        password: 'password123',
        fullName: 'Test Doctor',
        email: 'doctor@test.com',
        role: 'doctor',
        phone: '+63-111-111-1111',
        position: 'dentist'
      },
      {
        username: 'testpatient',
        password: 'password123',
        fullName: 'Test Patient',
        email: 'patient@test.com',
        role: 'patient',
        phone: '+63-222-222-2222',
        sex: 'Male',
        dateOfBirth: '1990-01-01',
        address: 'Test Patient Address'
      }
    ];

    for (const user of users) {
      const hashedPassword = await bcryptjs.hash(user.password, 10);

      // Delete existing if any
      await pool.query('DELETE FROM employees WHERE user_id IN (SELECT id FROM users WHERE username = ?)', [user.username]);
      await pool.query('DELETE FROM patients WHERE user_id IN (SELECT id FROM users WHERE username = ?)', [user.username]);
      await pool.query('DELETE FROM users WHERE username = ?', [user.username]);

      // Create user
      const [result] = await pool.query(
        'INSERT INTO users (username, password, fullName, email, role, phone, position, isFirstLogin, accountStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [user.username, hashedPassword, user.fullName, user.email, user.role, user.phone, user.position || null, false, 'active']
      );

      const userId = result.insertId;

      if (user.role === 'doctor') {
        // Create employee record
        await pool.query(
          'INSERT INTO employees (user_id, name, position, phone, email, address, dateHired, isCodeUsed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [userId, user.fullName, user.position, user.phone, user.email, 'Doctor Address', '2024-01-01', true]
        );
      } else if (user.role === 'patient') {
        // Create patient record
        await pool.query(
          'INSERT INTO patients (user_id, name, dateOfBirth, phone, email, sex, address, has_account) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)',
          [userId, user.fullName, user.dateOfBirth, user.phone, user.email, user.sex, user.address]
        );
      }

      console.log(`Created ${user.role}: ${user.username} / ${user.password}`);
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error creating test users:', error);
    await pool.end();
    process.exit(1);
  }
}

createTestUsers();
