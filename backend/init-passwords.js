const pool = require('./config/database');
const bcrypt = require('bcryptjs');

async function initializePasswords() {
  try {
    console.log('Initializing test user passwords...');
    
    // Hash passwords
    const doctorHash = await bcrypt.hash('doctor123', 10);
    const assistantHash = await bcrypt.hash('assistant123', 10);
    
    console.log('Doctor hash:', doctorHash);
    console.log('Assistant hash:', assistantHash);
    
    // Update doctor
    const [result1] = await pool.query(
      'UPDATE users SET password = ? WHERE username = ?',
      [doctorHash, 'doctor']
    );
    console.log('Updated doctor:', result1.affectedRows, 'rows');
    
    // Update assistant
    const [result2] = await pool.query(
      'UPDATE users SET password = ? WHERE username = ?',
      [assistantHash, 'assistant']
    );
    console.log('Updated assistant:', result2.affectedRows, 'rows');
    
    // Verify
    const [users] = await pool.query(
      'SELECT username, LENGTH(password) as pwd_len FROM users WHERE username IN (?, ?)',
      ['doctor', 'assistant']
    );
    console.log('Verification:', users);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

initializePasswords();
