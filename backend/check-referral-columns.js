const pool = require('./config/database');

async function checkReferralColumns() {
  try {
    // Get the table structure
    const [columns] = await pool.query('DESCRIBE referrals');
    
    console.log('\n=== REFERRALS TABLE COLUMNS ===\n');
    columns.forEach(col => {
      console.log(`${col.Field.padEnd(25)} | Type: ${col.Type.padEnd(35)} | Null: ${col.Null.padEnd(4)} | Key: ${col.Key || 'none'}`);
    });
    
    console.log('\n=== Checking for specific columns ===\n');
    const fieldNames = columns.map(c => c.Field);
    console.log('Has referringDentist:', fieldNames.includes('referringDentist'));
    console.log('Has referredByContact:', fieldNames.includes('referredByContact'));
    console.log('Has referredByEmail:', fieldNames.includes('referredByEmail'));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkReferralColumns();
