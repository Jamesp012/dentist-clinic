const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  multipleStatements: true
});

connection.connect((err) => {
  if (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }

  const sql = fs.readFileSync(path.join(__dirname, 'setup.sql'), 'utf8');

  connection.query(sql, (err) => {
    if (err) {
      console.error('SQL error:', err);
      connection.end();
      process.exit(1);
    }

    console.log('✓ Database initialized successfully!');
    console.log('✓ Login credentials:');
    console.log('  - doctor / doctor123');
    console.log('  - assistant / assistant123');
    
    connection.end();
  });
});
