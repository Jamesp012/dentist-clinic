const bcrypt = require('bcryptjs');

async function testPassword() {
  const storedHash = '$2a$10$7jcPEUHKJy9rN0lIl7A1wOfgIZsxDaRcEfNKkbVKBRmZBXql08sNW';
  const password = 'doctor123';
  
  console.log('Testing password match...');
  console.log('Stored hash:', storedHash);
  console.log('Testing password:', password);
  
  const match = await bcrypt.compare(password, storedHash);
  console.log('Match result:', match);
  
  if (!match) {
    console.log('Hash does not match! Generating fresh hash...');
    const newHash = await bcrypt.hash(password, 10);
    console.log('Fresh hash:', newHash);
    
    const testMatch = await bcrypt.compare(password, newHash);
    console.log('Testing fresh hash:', testMatch);
  }
}

testPassword().catch(console.error);
