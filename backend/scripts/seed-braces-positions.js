#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function ensureTable() {
  const createSql = `
    CREATE TABLE IF NOT EXISTS braces_positions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      scope VARCHAR(16) NOT NULL,
      patient_id INT NULL,
      upper_positions JSON NOT NULL,
      lower_positions JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY ux_scope_patient (scope, patient_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.query(createSql);
}

async function main() {
  try {
    const file = path.join(__dirname, '..', '..', 'src', 'data', 'braces_positions_5178.json');
    const raw = fs.readFileSync(file, 'utf8');
    const json = JSON.parse(raw);
    const upper = json.upper || [];
    const lower = json.lower || [];

    await ensureTable();

    // insert global
    const insertSql = `
      INSERT INTO braces_positions (scope, patient_id, upper_positions, lower_positions)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE upper_positions = VALUES(upper_positions), lower_positions = VALUES(lower_positions), updated_at = NOW()
    `;
    await pool.query(insertSql, ['global', null, JSON.stringify(upper), JSON.stringify(lower)]);
    console.log('Inserted/updated global braces positions');

    // get all patients
    const [patients] = await pool.query('SELECT id FROM patients');
    console.log('Found', patients.length, 'patients; seeding positions for each');

    for (const p of patients) {
      await pool.query(insertSql, ['patient', p.id, JSON.stringify(upper), JSON.stringify(lower)]);
    }

    console.log('Seeded positions for all patients');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding braces positions:', err);
    process.exit(1);
  }
}

main();
