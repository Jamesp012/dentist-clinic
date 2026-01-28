const pool = require('./config/database');

async function addAccountStatus() {
  try {
    console.log('Adding accountStatus column to users table...');
    
    // Check if column already exists
    const [columns] = await pool.query(
      "SHOW COLUMNS FROM users LIKE 'accountStatus'"
    );
    
    if (columns.length > 0) {
      console.log('✓ accountStatus column already exists');
      process.exit(0);
      return;
    }
    
    // Add the column
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN accountStatus ENUM('pending', 'active', 'inactive') DEFAULT 'active' 
      AFTER isFirstLogin
    `);
    
    console.log('✓ accountStatus column added successfully!');
    
    // Update existing users to have active status
    await pool.query("UPDATE users SET accountStatus = 'active'");
    console.log('✓ Existing users updated to active status');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addAccountStatus();
