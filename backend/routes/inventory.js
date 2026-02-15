cdcdconst express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { normalizeInventoryPayload, toNumber } = require('../utils/inventoryUnits');

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
    const normalized = normalizeInventoryPayload(req.body || {});
    const name = req.body.name?.trim();
    if (!name) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const minQuantity = Math.max(0, Math.floor(toNumber(req.body.minQuantity, 0)));
    const category = req.body.category || 'General';
    const supplier = req.body.supplier || '';
    const cost = toNumber(req.body.cost, 0);

    const piecesPerUnit = normalized.hasConversion ? normalized.conversionValue : null;
    const mainQuantity = normalized.mainQuantity ?? normalized.quantity;
    const totalPieces = normalized.totalPieces ?? normalized.baseQuantity;

    const [result] = await pool.query(
      `INSERT INTO inventory 
        (name, category, quantity, main_quantity, minQuantity, unit, unit_type, pieces_per_box, pieces_per_unit, remaining_pieces, supplier, cost, base_unit, main_unit, conversion_value, base_quantity, total_pieces)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        category,
        mainQuantity,
        mainQuantity,
        minQuantity,
        normalized.baseUnit,
        normalized.unitType,
        piecesPerUnit,
        piecesPerUnit,
        normalized.hasConversion ? normalized.remainingPieces : null,
        supplier,
        cost,
        normalized.baseUnit,
        normalized.hasConversion ? normalized.mainUnit : null,
        piecesPerUnit,
        totalPieces,
        totalPieces,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM inventory WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update inventory
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const normalized = normalizeInventoryPayload(req.body || {});
    const name = req.body.name?.trim();
    if (!name) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const minQuantity = Math.max(0, Math.floor(toNumber(req.body.minQuantity, 0)));
    const category = req.body.category || 'General';
    const supplier = req.body.supplier || '';
    const cost = toNumber(req.body.cost, 0);

    const piecesPerUnit = normalized.hasConversion ? normalized.conversionValue : null;
    const mainQuantity = normalized.mainQuantity ?? normalized.quantity;
    const totalPieces = normalized.totalPieces ?? normalized.baseQuantity;

    await pool.query(
      `UPDATE inventory SET 
        name=?,
        category=?,
        quantity=?,
        main_quantity=?,
        minQuantity=?,
        unit=?,
        unit_type=?,
        pieces_per_box=?,
        pieces_per_unit=?,
        remaining_pieces=?,
        supplier=?,
        cost=?,
        base_unit=?,
        main_unit=?,
        conversion_value=?,
        base_quantity=?,
        total_pieces=?
      WHERE id=?`,
      [
        name,
        category,
        mainQuantity,
        mainQuantity,
        minQuantity,
        normalized.baseUnit,
        normalized.unitType,
        piecesPerUnit,
        piecesPerUnit,
        normalized.hasConversion ? normalized.remainingPieces : null,
        supplier,
        cost,
        normalized.baseUnit,
        normalized.hasConversion ? normalized.mainUnit : null,
        piecesPerUnit,
        totalPieces,
        totalPieces,
        req.params.id,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
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
