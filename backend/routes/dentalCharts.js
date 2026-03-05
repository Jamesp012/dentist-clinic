const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Ensure table exists and has correct structure
async function ensureTable() {
  try {
    // Check if table exists
    const [tables] = await pool.query("SHOW TABLES LIKE 'dental_charts'");
    
    if (tables.length === 0) {
      const createSql = `
        CREATE TABLE dental_charts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          chart_id VARCHAR(100) NOT NULL,
          patient_id VARCHAR(100) NOT NULL,
          chart_date VARCHAR(100) NOT NULL,
          chart_data LONGTEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY ux_patient_chart (patient_id, chart_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `;
      await pool.query(createSql);
    } else {
      // Table exists, ensure columns are correct type
      // 1. patient_id should be VARCHAR to support temp IDs
      await pool.query('ALTER TABLE dental_charts MODIFY COLUMN patient_id VARCHAR(100) NOT NULL').catch(err => console.error('Error altering patient_id:', err));
      
      // 2. chart_id should be VARCHAR
      await pool.query('ALTER TABLE dental_charts MODIFY COLUMN chart_id VARCHAR(100) NOT NULL').catch(err => console.error('Error altering chart_id:', err));
      
      // 3. chart_date should be VARCHAR to support any string format from frontend
      await pool.query('ALTER TABLE dental_charts MODIFY COLUMN chart_date VARCHAR(100) NOT NULL').catch(err => console.error('Error altering chart_date:', err));
      
      // 4. Ensure chart_data is LONGTEXT (better than JSON for varied MariaDB versions)
      await pool.query('ALTER TABLE dental_charts MODIFY COLUMN chart_data LONGTEXT NOT NULL').catch(err => console.error('Error altering chart_data:', err));

      // 5. Ensure UNIQUE KEY exists
      try {
        const [indexes] = await pool.query("SHOW INDEX FROM dental_charts WHERE Key_name = 'ux_patient_chart'");
        if (indexes.length === 0) {
          await pool.query('ALTER TABLE dental_charts ADD UNIQUE KEY ux_patient_chart (patient_id, chart_id)');
        }
      } catch (err) {
        console.error('Error adding unique key:', err);
      }
    }
  } catch (error) {
    console.error('Error in ensureTable:', error);
    // Don't throw if it's just a table existence issue, but we logged it
  }
}

// POST save dental chart
router.post('/', authMiddleware, async (req, res) => {
  try {
    await ensureTable();
    const { patientId, id: chartId, date, data } = req.body;

    if (!patientId || !chartId) {
      return res.status(400).json({ error: 'patientId and id are required' });
    }

    const sql = `
      INSERT INTO dental_charts (patient_id, chart_id, chart_date, chart_data)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE chart_date = VALUES(chart_date), chart_data = VALUES(chart_data)
    `;
    await pool.query(sql, [patientId, chartId, date, JSON.stringify(data)]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error saving dental chart:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET dental charts by patientId
router.get('/', authMiddleware, async (req, res) => {
  try {
    await ensureTable();
    const { patientId } = req.query;

    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }

    const [rows] = await pool.query(
      'SELECT chart_id as id, chart_date as date, patient_id as patientId, chart_data as data FROM dental_charts WHERE patient_id = ? ORDER BY created_at ASC',
      [patientId]
    );

    // Map rows to the format expected by frontend
    const charts = rows.map(row => ({
      id: row.id,
      date: row.date,
      patientId: row.patientId,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data
    }));

    res.json(charts);
  } catch (error) {
    console.error('Error fetching dental charts:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE dental chart
router.delete('/', authMiddleware, async (req, res) => {
  try {
    await ensureTable();
    const { patientId, id: chartId } = req.query;

    if (!patientId || !chartId) {
      return res.status(400).json({ error: 'patientId and id are required' });
    }

    await pool.query('DELETE FROM dental_charts WHERE patient_id = ? AND chart_id = ?', [patientId, chartId]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting dental chart:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
