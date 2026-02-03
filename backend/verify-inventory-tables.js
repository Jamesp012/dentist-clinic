#!/usr/bin/env node

const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dental_clinic',
    port: Number(process.env.DB_PORT) || 3306
  });

  try {
    console.log('Verifying inventory auto-reduction tables...\n');

    const [tables] = await pool.query(`
      SHOW TABLES LIKE 'inventory_auto_reduction%'
    `);
    
    console.log('✓ Auto-reduction tables found:');
    tables.forEach(t => {
      const tableName = Object.values(t)[0];
      console.log(`  - ${tableName}`);
    });

    console.log('\n--- inventory_auto_reduction_rules_v2 ---');
    const [v2cols] = await pool.query(`
      DESCRIBE inventory_auto_reduction_rules_v2
    `);
    console.log('Columns:');
    v2cols.forEach(c => {
      console.log(`  - ${c.Field} (${c.Type}) ${c.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${c.Key ? '(' + c.Key + ')' : ''}`);
    });

    const [v2rows] = await pool.query(`
      SELECT COUNT(*) as count FROM inventory_auto_reduction_rules_v2
    `);
    console.log(`Records: ${v2rows[0].count}`);

    console.log('\n--- inventory_auto_reduction_rule_items ---');
    const [itemcols] = await pool.query(`
      DESCRIBE inventory_auto_reduction_rule_items
    `);
    console.log('Columns:');
    itemcols.forEach(c => {
      console.log(`  - ${c.Field} (${c.Type}) ${c.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${c.Key ? '(' + c.Key + ')' : ''}`);
    });

    const [itemrows] = await pool.query(`
      SELECT COUNT(*) as count FROM inventory_auto_reduction_rule_items
    `);
    console.log(`Records: ${itemrows[0].count}`);

    console.log('\n✅ Database tables verified successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
})();
