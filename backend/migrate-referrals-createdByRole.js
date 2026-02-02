const pool = require('./config/database');

async function addCreatedByRoleToReferrals() {
  try {
    console.log('Checking if createdByRole column exists in referrals table...');
    
    // First, describe the table to see its current structure
    const [columns] = await pool.query('DESCRIBE referrals');
    const hasCreatedByRole = columns.some(col => col.Field === 'createdByRole');
    
    if (hasCreatedByRole) {
      console.log('✓ createdByRole column already exists in referrals table');
      process.exit(0);
      return;
    }
    
    // Add the column if it doesn't exist
    console.log('Adding createdByRole column to referrals table...');
    await pool.query(`
      ALTER TABLE referrals 
      ADD COLUMN createdByRole ENUM('patient', 'staff') DEFAULT 'staff'
    `);
    
    console.log('✓ Successfully added createdByRole column to referrals table');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addCreatedByRoleToReferrals();
