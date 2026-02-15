const pool = require('../config/database');

async function migrate() {
  try {
    const columns = [
      'ADD COLUMN main_quantity INT DEFAULT NULL',
      'ADD COLUMN unit_type VARCHAR(20) DEFAULT NULL',
      'ADD COLUMN pieces_per_box INT DEFAULT NULL',
      'ADD COLUMN pieces_per_unit INT DEFAULT NULL',
      'ADD COLUMN remaining_pieces INT DEFAULT NULL',
      'ADD COLUMN base_unit VARCHAR(20) DEFAULT NULL',
      'ADD COLUMN main_unit VARCHAR(20) DEFAULT NULL',
      'ADD COLUMN conversion_value INT DEFAULT NULL',
      'ADD COLUMN base_quantity INT DEFAULT NULL',
      'ADD COLUMN total_pieces INT DEFAULT NULL'
    ];

    for (const col of columns) {
      try {
        await pool.query('ALTER TABLE inventory ' + col);
      } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
          console.log('Column already exists, skipping...');
        } else {
          throw err;
        }
      }
    }

    console.log('Inventory table updated with all missing columns.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
