const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all inventory
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [items] = await pool.query('SELECT * FROM inventory');
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create inventory item
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, category, quantity, minQuantity, unit, supplier, cost } = req.body;
    const [result] = await pool.query(
      'INSERT INTO inventory (name, category, quantity, minQuantity, unit, supplier, cost) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, category, quantity, minQuantity, unit, supplier, cost]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update inventory
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, category, quantity, minQuantity, unit, supplier, cost } = req.body;
    await pool.query(
      'UPDATE inventory SET name=?, category=?, quantity=?, minQuantity=?, unit=?, supplier=?, cost=? WHERE id=?',
      [name, category, quantity, minQuantity, unit, supplier, cost, req.params.id]
    );
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete inventory item
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory WHERE id = ?', [req.params.id]);
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
