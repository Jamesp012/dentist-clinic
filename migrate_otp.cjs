const pool = require('./backend/config/database');
async function migrate() {
  try {
    // Add email column if not exists
    const [cols] = await pool.query('SHOW COLUMNS FROM otp_verifications LIKE "email"');
    if (cols.length === 0) {
      await pool.query('ALTER TABLE otp_verifications ADD COLUMN email VARCHAR(255) NULL AFTER phone');
      console.log('Added email column to otp_verifications');
    }

    // Add type column if not exists
    const [typeCols] = await pool.query('SHOW COLUMNS FROM otp_verifications LIKE "type"');
    if (typeCols.length === 0) {
      await pool.query('ALTER TABLE otp_verifications ADD COLUMN type ENUM("phone", "email") DEFAULT "phone" AFTER email');
      console.log('Added type column to otp_verifications');
    }

    // Make phone NULLABLE since we might only have email
    await pool.query('ALTER TABLE otp_verifications MODIFY COLUMN phone VARCHAR(20) NULL');
    console.log('Modified phone column to be nullable');

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
migrate();