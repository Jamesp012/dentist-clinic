const pool = require('./config/database');
const bcryptjs = require('bcryptjs');

async function resetDoctor() {
  try {
    const username = 'doctor';
    const password = 'doctor123';
    
    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Update doctor's password
    const [result] = await pool.query(
      'UPDATE users SET password = ? WHERE username = ?',
      [hashedPassword, username]
    );

    if (result.affectedRows > 0) {
      console.log(`Doctor password reset successfully!`);
      console.log(`Username: ${username}`);
      console.log(`Password: ${password}`);
    } else {
      console.log(`Doctor user not found. Creating a new one...`);
      
      const fullName = 'Dr. Joseph Maaño';
      const email = 'dentalclinic@maañodentalcare.com';
      const phone = '+63-9123-456-789';
      
      // Create new doctor user
      const [insertResult] = await pool.query(
        'INSERT INTO users (username, password, fullName, email, role, phone, position, isFirstLogin, accountStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [username, hashedPassword, fullName, email, 'doctor', phone, 'dentist', false, 'active']
      );
      
      // Also ensure employee record exists
      await pool.query('DELETE FROM employees WHERE user_id = ? OR email = ?', [insertResult.insertId, email]);
      await pool.query(
        'INSERT INTO employees (user_id, name, position, phone, email, address, dateHired, isCodeUsed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [insertResult.insertId, fullName, 'dentist', phone, email, '123 Medical Plaza', '2020-01-15', true]
      );
      
      console.log(`New doctor user created successfully!`);
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error resetting doctor:', error);
    await pool.end();
    process.exit(1);
  }
}

resetDoctor();
