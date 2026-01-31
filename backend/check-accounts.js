const pool = require('./config/database');

async function checkAccounts() {
  try {
    const [users] = await pool.query('SELECT id, username, fullName, email, role, position, accountStatus FROM users');
    
    console.log('\n📋 Existing Accounts:\n');
    
    if (users.length === 0) {
      console.log('❌ No accounts found in the database.\n');
    } else {
      console.log(`Found ${users.length} account(s):\n`);
      users.forEach(user => {
        console.log(`ID: ${user.id}`);
        console.log(`Username: ${user.username}`);
        console.log(`Name: ${user.fullName || 'N/A'}`);
        console.log(`Email: ${user.email || 'N/A'}`);
        console.log(`Role: ${user.role}`);
        console.log(`Position: ${user.position || 'N/A'}`);
        console.log(`Status: ${user.accountStatus || 'active'}`);
        console.log('─────────────────────────────\n');
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAccounts();
