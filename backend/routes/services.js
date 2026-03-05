const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all services
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [services] = await pool.query('SELECT * FROM serviceprices ORDER BY serviceName ASC');
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new service
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { serviceName, description, price, category, duration } = req.body;
    const [result] = await pool.query(
      'INSERT INTO serviceprices (serviceName, description, price, category, duration) VALUES (?, ?, ?, ?, ?)',
      [serviceName, description || null, price, category || null, duration || null]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a service
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceName, description, price, category, duration } = req.body;
    await pool.query(
      'UPDATE serviceprices SET serviceName = ?, description = ?, price = ?, category = ?, duration = ? WHERE id = ?',
      [serviceName, description || null, price, category || null, duration || null, id]
    );
    res.json({ id, ...req.body });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a service
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM serviceprices WHERE id = ?', [id]);
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
