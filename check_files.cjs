const pool = require('./backend/config/database');
pool.query('SELECT * FROM referral_files ORDER BY uploadedDate DESC LIMIT 5')
  .then(([rows]) => {
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
