/**
 * Migration script to add access_level column to users table
 * This adds the accessLevel field and sets defaults for existing users
 */

const pool = require('./config/database');

async function migrate() {
  try {
    console.log('Starting access level migration...');

    // Check if the column already exists
    const [columns] = await pool.query(
      "SHOW COLUMNS FROM users LIKE 'accessLevel'"
    );

    if (columns.length > 0) {
      console.log('accessLevel column already exists. Skipping migration.');
      return;
    }

    // Add accessLevel column
    console.log('Adding accessLevel column to users table...');
    await pool.query(
      "ALTER TABLE users ADD COLUMN accessLevel ENUM('Admin', 'Super Admin', 'Default Accounts') DEFAULT 'Default Accounts'"
    );
    console.log('✓ accessLevel column added');

    // Check if employees table needs the column too
    const [empColumns] = await pool.query(
      "SHOW COLUMNS FROM employees LIKE 'accessLevel'"
    );

    if (empColumns.length === 0) {
      console.log('Adding accessLevel column to employees table...');
      await pool.query(
        "ALTER TABLE employees ADD COLUMN accessLevel ENUM('Admin', 'Super Admin', 'Default Accounts') DEFAULT 'Default Accounts'"
      );
      console.log('✓ accessLevel column added to employees table');
    }

    // Set Dr. Joseph Maaño to Super Admin
    console.log('Setting Dr. Joseph Maaño to Super Admin...');
    await pool.query(
      "UPDATE users SET accessLevel = 'Super Admin' WHERE fullName LIKE '%Joseph%' OR fullName LIKE '%joseph%'"
    );
    await pool.query(
      "UPDATE employees SET accessLevel = 'Super Admin' WHERE name LIKE '%Joseph%' OR name LIKE '%joseph%'"
    );
    console.log('✓ Dr. Joseph Maaño set to Super Admin');

    // Set Almira to Admin
    console.log('Setting Almira to Admin...');
    await pool.query(
      "UPDATE users SET accessLevel = 'Admin' WHERE fullName = 'Almira' OR username = 'almira'"
    );
    await pool.query(
      "UPDATE employees SET accessLevel = 'Admin' WHERE name = 'Almira'"
    );
    console.log('✓ Almira set to Admin');

    console.log('\n✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
