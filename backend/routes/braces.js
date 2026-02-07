const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Ensure table exists
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

// POST save positions
router.post('/positions', authMiddleware, async (req, res) => {
  try {
    await ensureTable();
    const { scope, patientId, upper, lower } = req.body;
    const s = scope === 'patient' ? 'patient' : 'global';
    const pid = patientId || null;

    // Insert or update
    const sql = `
      INSERT INTO braces_positions (scope, patient_id, upper_positions, lower_positions)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE upper_positions = VALUES(upper_positions), lower_positions = VALUES(lower_positions), updated_at = NOW()
    `;
    await pool.query(sql, [s, pid, JSON.stringify(upper || []), JSON.stringify(lower || [])]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error saving braces positions:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET positions - optional ?patientId=
router.get('/positions', authMiddleware, async (req, res) => {
  try {
    await ensureTable();
    const patientId = req.query.patientId ? Number(req.query.patientId) : null;

    if (patientId) {
      const [rows] = await pool.query('SELECT * FROM braces_positions WHERE scope = ? AND patient_id = ? LIMIT 1', ['patient', patientId]);
      if (rows.length > 0) {
        const row = rows[0];
        return res.json({ upper: JSON.parse(row.upper_positions), lower: JSON.parse(row.lower_positions) });
      }
    }

    // fallback to global
    const [grows] = await pool.query('SELECT * FROM braces_positions WHERE scope = ? LIMIT 1', ['global']);
    if (grows.length > 0) {
      const row = grows[0];
      return res.json({ upper: JSON.parse(row.upper_positions), lower: JSON.parse(row.lower_positions) });
    }

    // nothing yet
    res.status(404).json({ error: 'Positions not found' });
  } catch (error) {
    console.error('Error fetching braces positions:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
