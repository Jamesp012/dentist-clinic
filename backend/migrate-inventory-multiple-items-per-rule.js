#!/usr/bin/env node

const pool = require('./config/database');

async function migrate() {
  try {
    console.log('Starting migration: Multiple items per auto-reduction rule...');

    // Check if new table exists
    const [existingTable] = await pool.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dental_clinic' AND TABLE_NAME = 'inventory_auto_reduction_rules_v2'
    `);

    if (existingTable.length > 0) {
      console.log('✓ Migration already applied');
      process.exit(0);
    }

    // Create new rules table that supports multiple items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_auto_reduction_rules_v2 (
        id INT PRIMARY KEY AUTO_INCREMENT,
        appointmentType VARCHAR(255) NOT NULL CHARACTER SET utf8mb4,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_appointment_type (appointmentType)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('✓ Created inventory_auto_reduction_rules_v2 table');

    // Create items table (junction/detail table)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_auto_reduction_rule_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        ruleId INT NOT NULL,
        inventoryItemId INT NOT NULL,
        quantityToReduce INT NOT NULL DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ruleId) REFERENCES inventory_auto_reduction_rules_v2(id) ON DELETE CASCADE,
        FOREIGN KEY (inventoryItemId) REFERENCES inventory(id) ON DELETE CASCADE,
        UNIQUE KEY unique_rule_item (ruleId, inventoryItemId)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('✓ Created inventory_auto_reduction_rule_items table');

    // Migrate data from old table to new structure
    const [oldRules] = await pool.query(`
      SELECT DISTINCT appointmentType, isActive FROM inventory_auto_reduction_rules
      ORDER BY appointmentType
    `);

    console.log(`Migrating ${oldRules.length} appointment types...`);

    for (const oldRule of oldRules) {
      // Create rule in new table
      const [ruleResult] = await pool.query(`
        INSERT INTO inventory_auto_reduction_rules_v2 (appointmentType, isActive)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)
      `, [oldRule.appointmentType, oldRule.isActive]);

      const newRuleId = ruleResult.insertId;

      // Get all items for this appointment type
      const [items] = await pool.query(`
        SELECT inventoryItemId, quantityToReduce FROM inventory_auto_reduction_rules
        WHERE appointmentType = ?
      `, [oldRule.appointmentType]);

      // Insert items for this rule
      for (const item of items) {
        await pool.query(`
          INSERT INTO inventory_auto_reduction_rule_items (ruleId, inventoryItemId, quantityToReduce)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE quantityToReduce = VALUES(quantityToReduce)
        `, [newRuleId, item.inventoryItemId, item.quantityToReduce]);
      }
    }

    console.log('✓ Migrated all data to new structure');

    // Create view for backward compatibility
    await pool.query(`
      CREATE OR REPLACE VIEW inventory_auto_reduction_rules_view AS
      SELECT 
        r.id,
        r.appointmentType,
        ri.inventoryItemId,
        ri.quantityToReduce,
        r.isActive,
        r.createdAt,
        r.updatedAt
      FROM inventory_auto_reduction_rules_v2 r
      LEFT JOIN inventory_auto_reduction_rule_items ri ON r.id = ri.ruleId
    `);
    console.log('✓ Created backward compatibility view');

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNew table structure:');
    console.log('  - inventory_auto_reduction_rules_v2: Stores appointment type rules');
    console.log('  - inventory_auto_reduction_rule_items: Stores items for each rule');
    console.log('\nOld table (inventory_auto_reduction_rules) can be dropped after verification');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
