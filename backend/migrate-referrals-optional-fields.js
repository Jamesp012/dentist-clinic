const pool = require('./config/database');

async function migrateReferralsTable() {
  try {
    console.log('Starting migration: Making specialty, reason nullable and adding default for urgency...');

    // Make specialty column nullable
    await pool.query(`
      ALTER TABLE referrals 
      MODIFY COLUMN specialty VARCHAR(100) CHARACTER SET utf8mb4 NULL
    `);
    console.log('✓ Made specialty nullable');

    // Make reason column nullable
    await pool.query(`
      ALTER TABLE referrals 
      MODIFY COLUMN reason TEXT CHARACTER SET utf8mb4 NULL
    `);
    console.log('✓ Made reason nullable');

    // Add default value for urgency
    await pool.query(`
      ALTER TABLE referrals 
      MODIFY COLUMN urgency ENUM('routine', 'urgent', 'emergency') DEFAULT 'routine'
    `);
    console.log('✓ Added default value for urgency');

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateReferralsTable();
