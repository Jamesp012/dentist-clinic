const pool = require('../config/database');

async function migrate() {
  try {
    // Create inventory_history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        inventory_id INT NOT NULL,
        change_amount INT NOT NULL,
        previous_quantity INT NOT NULL,
        new_quantity INT NOT NULL,
        unit_type VARCHAR(50) NOT NULL, -- e.g., 'box', 'vial', 'pcs'
        action_type ENUM('add', 'subtract', 'set') NOT NULL,
        reason VARCHAR(255),
        updated_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
      )
    `);

    console.log('inventory_history table created or already exists.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
