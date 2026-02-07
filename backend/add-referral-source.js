const pool = require('./config/database');

async function migrate() {
  try {
    console.log('Starting migration to add `source` column to referrals...');

    try {
      await pool.query(`
        ALTER TABLE referrals
        ADD COLUMN source ENUM('patient-uploaded', 'staff-upload', 'external') DEFAULT 'staff-upload' AFTER referralType
      `);
      console.log('✓ Added `source` column to referrals table');
    } catch (error) {
      if (error.message && error.message.includes('Duplicate column')) {
        console.log('✓ `source` column already exists');
      } else {
        throw error;
      }
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
