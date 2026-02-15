cdcdconst express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
const { normalizeInventoryPayload, toNumber, deriveQuantitiesFromBase } = require('../utils/inventoryUnits');

// Get inventory history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const [history] = await pool.query(
      `SELECT h.*, i.name as item_name 
       FROM inventory_history h 
       JOIN inventory i ON h.inventory_id = i.id 
       ORDER BY h.created_at DESC LIMIT 100`
    );
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get history for a specific item
router.get('/:id/history', authMiddleware, async (req, res) => {
  try {
    const [history] = await pool.query(
      'SELECT * FROM inventory_history WHERE inventory_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual stock update
router.post('/:id/update-stock', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { amount, action, reason, unitType } = req.body; // action: 'add', 'subtract', 'set'
    const updatedBy = req.user.username;

    const [items] = await connection.query('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    if (items.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = items[0];
    const conversionValue = item.conversion_value || 1;
    
    let currentBaseQty = item.total_pieces || item.base_quantity || item.quantity || 0;
    let changeInBase = 0;

    // Calculate change in base units (pieces)
    // If unitType is 'pcs' (vials case), amount is literal pieces.
    // Otherwise, amount is in bulk units (boxes/packs).
    if (unitType === 'pcs' || unitType === 'piece') {
      changeInBase = amount;
    } else {
      changeInBase = amount * conversionValue;
    }

    let newBaseQty = currentBaseQty;
    if (action === 'add') {
      newBaseQty = currentBaseQty + changeInBase;
    } else if (action === 'subtract') {
      newBaseQty = Math.max(0, currentBaseQty - changeInBase);
    } else if (action === 'set') {
      newBaseQty = changeInBase;
    }

    const actualChange = newBaseQty - currentBaseQty;

    // Update inventory
    const breakdown = deriveQuantitiesFromBase(newBaseQty, conversionValue);
    
    await connection.query(
      `UPDATE inventory SET 
        quantity = ?, 
        main_quantity = ?, 
        remaining_pieces = ?, 
        total_pieces = ?, 
        base_quantity = ? 
      WHERE id = ?`,
      [
        breakdown.quantity,
        breakdown.quantity,
        breakdown.remaining_pieces,
        newBaseQty,
        newBaseQty,
        req.params.id
      ]
    );

    // Record history
    await connection.query(
      `INSERT INTO inventory_history 
        (inventory_id, change_amount, previous_quantity, new_quantity, unit_type, action_type, reason, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.params.id, amount, currentBaseQty, newBaseQty, unitType, action, reason, updatedBy]
    );

    await connection.commit();
    
    const [updated] = await connection.query('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

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
