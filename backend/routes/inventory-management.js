const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ==================== OVERVIEW ENDPOINTS ====================

// Get inventory overview (all items with status)
router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const [items] = await pool.query(`
      SELECT 
        id,
        name,
        category,
        quantity,
        minQuantity,
        unit,
        supplier,
        cost,
        CASE 
          WHEN quantity = 0 THEN 'out_of_stock'
          WHEN quantity <= minQuantity THEN 'critical'
          ELSE 'normal'
        END as status
      FROM inventory
      ORDER BY status DESC, quantity ASC
    `);

    const overview = {
      total: items.length,
      normal: items.filter(i => i.status === 'normal').length,
      critical: items.filter(i => i.status === 'critical').length,
      outOfStock: items.filter(i => i.status === 'out_of_stock').length,
      items
    };

    res.json(overview);
  } catch (error) {
    console.error('Error fetching inventory overview:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get critical and out of stock items
router.get('/alerts', authMiddleware, async (req, res) => {
  try {
    const [items] = await pool.query(`
      SELECT 
        id,
        name,
        category,
        quantity,
        minQuantity,
        unit,
        CASE 
          WHEN quantity = 0 THEN 'out_of_stock'
          WHEN quantity <= minQuantity THEN 'critical'
        END as status
      FROM inventory
      WHERE quantity <= minQuantity
      ORDER BY quantity ASC
    `);

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AUTO-REDUCTION RULES ENDPOINTS ====================

// Get all auto-reduction rules
router.get('/auto-reduction/rules', authMiddleware, async (req, res) => {
  try {
    const [rules] = await pool.query(`
      SELECT 
        r.id as ruleId,
        r.appointmentType,
        ri.id as itemId,
        ri.inventoryItemId,
        ri.quantityToReduce,
        r.isActive,
        i.name as inventoryItemName,
        i.category,
        i.quantity as currentQuantity,
        r.createdAt,
        r.updatedAt
      FROM inventory_auto_reduction_rules_v2 r
      LEFT JOIN inventory_auto_reduction_rule_items ri ON r.id = ri.ruleId
      LEFT JOIN inventory i ON ri.inventoryItemId = i.id
      ORDER BY r.appointmentType, i.name
    `);

    res.json(rules);
  } catch (error) {
    console.error('Error fetching auto-reduction rules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get rules for specific appointment type
router.get('/auto-reduction/rules/type/:appointmentType', authMiddleware, async (req, res) => {
  try {
    const [rules] = await pool.query(`
      SELECT 
        r.id as ruleId,
        r.appointmentType,
        ri.id as itemId,
        ri.inventoryItemId,
        ri.quantityToReduce,
        r.isActive,
        i.name as inventoryItemName,
        i.quantity as currentQuantity
      FROM inventory_auto_reduction_rules_v2 r
      LEFT JOIN inventory_auto_reduction_rule_items ri ON r.id = ri.ruleId
      LEFT JOIN inventory i ON ri.inventoryItemId = i.id
      WHERE r.appointmentType = ? AND r.isActive = TRUE
      ORDER BY i.name
    `, [req.params.appointmentType]);

    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new auto-reduction rule
router.post('/auto-reduction/rules', authMiddleware, async (req, res) => {
  try {
    const { appointmentType, inventoryItemIds, quantityToReduce } = req.body;

    if (!appointmentType || !inventoryItemIds || !Array.isArray(inventoryItemIds) || inventoryItemIds.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: appointmentType and non-empty inventoryItemIds array' });
    }

    // Ensure quantityToReduce is provided (default to 1)
    const qty = quantityToReduce || 1;

    // Check if rule already exists for this appointment type
    const [existingRule] = await pool.query(
      'SELECT id FROM inventory_auto_reduction_rules_v2 WHERE appointmentType = ?',
      [appointmentType]
    );

    let ruleId;
    if (existingRule.length > 0) {
      ruleId = existingRule[0].id;
    } else {
      // Create new rule
      const [result] = await pool.query(
        'INSERT INTO inventory_auto_reduction_rules_v2 (appointmentType, isActive) VALUES (?, TRUE)',
        [appointmentType]
      );
      ruleId = result.insertId;
    }

    // Add items to the rule
    const itemIds = Array.isArray(inventoryItemIds) ? inventoryItemIds : [inventoryItemIds];
    for (const itemId of itemIds) {
      // Check if item already exists for this rule
      const [existingItem] = await pool.query(
        'SELECT id FROM inventory_auto_reduction_rule_items WHERE ruleId = ? AND inventoryItemId = ?',
        [ruleId, itemId]
      );

      if (existingItem.length === 0) {
        await pool.query(
          'INSERT INTO inventory_auto_reduction_rule_items (ruleId, inventoryItemId, quantityToReduce) VALUES (?, ?, ?)',
          [ruleId, itemId, qty]
        );
      }
    }

    res.status(201).json({ 
      message: 'Auto-reduction rule created successfully',
      ruleId: ruleId 
    });
  } catch (error) {
    console.error('Error creating auto-reduction rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update auto-reduction rule item
router.put('/auto-reduction/rules/:id', authMiddleware, async (req, res) => {
  try {
    const { quantityToReduce, isActive } = req.body;
    const itemId = req.params.id;

    // Verify item exists (this is the rule_item id, not rule id)
    const [existing] = await pool.query(
      'SELECT * FROM inventory_auto_reduction_rule_items WHERE id = ?',
      [itemId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Rule item not found' });
    }

    if (quantityToReduce !== undefined) {
      await pool.query(
        'UPDATE inventory_auto_reduction_rule_items SET quantityToReduce = ? WHERE id = ?',
        [quantityToReduce, itemId]
      );
    }

    // Update rule-level isActive if provided
    if (isActive !== undefined) {
      const ruleId = existing[0].ruleId;
      await pool.query(
        'UPDATE inventory_auto_reduction_rules_v2 SET isActive = ?, updatedAt = NOW() WHERE id = ?',
        [isActive, ruleId]
      );
    }

    res.json({ message: 'Auto-reduction rule updated successfully' });
  } catch (error) {
    console.error('Error updating auto-reduction rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete auto-reduction rule item
router.delete('/auto-reduction/rules/:id', authMiddleware, async (req, res) => {
  try {
    const itemId = req.params.id;

    const [existing] = await pool.query(
      'SELECT ruleId FROM inventory_auto_reduction_rule_items WHERE id = ?',
      [itemId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Rule item not found' });
    }

    // Delete the item from the rule
    await pool.query('DELETE FROM inventory_auto_reduction_rule_items WHERE id = ?', [itemId]);

    // Check if the rule has any items left; if not, delete the rule
    const [remainingItems] = await pool.query(
      'SELECT COUNT(*) as count FROM inventory_auto_reduction_rule_items WHERE ruleId = ?',
      [existing[0].ruleId]
    );

    if (remainingItems[0].count === 0) {
      await pool.query('DELETE FROM inventory_auto_reduction_rules_v2 WHERE id = ?', [existing[0].ruleId]);
    }

    res.json({ message: 'Auto-reduction rule item deleted successfully' });
  } catch (error) {
    console.error('Error deleting auto-reduction rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset auto-reduction rules for appointment type
router.post('/auto-reduction/rules/reset/:appointmentType', authMiddleware, async (req, res) => {
  try {
    const appointmentType = req.params.appointmentType;

    // Find the rule ID for this appointment type
    const [rules] = await pool.query(
      'SELECT id FROM inventory_auto_reduction_rules_v2 WHERE appointmentType = ?',
      [appointmentType]
    );

    if (rules.length > 0) {
      // Delete all items for this rule
      await pool.query(
        'DELETE FROM inventory_auto_reduction_rule_items WHERE ruleId = ?',
        [rules[0].id]
      );
      
      // Delete the rule
      await pool.query(
        'DELETE FROM inventory_auto_reduction_rules_v2 WHERE id = ?',
        [rules[0].id]
      );
    }

    res.json({ message: 'Auto-reduction rules reset successfully' });
  } catch (error) {
    console.error('Error resetting auto-reduction rules:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== REDUCTION HISTORY ENDPOINTS ====================

// Get all reduction history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const limit = req.query.limit || 100;
    const offset = req.query.offset || 0;

    const [history] = await pool.query(`
      SELECT 
        id,
        appointmentId,
        patientId,
        patientName,
        appointmentType,
        inventoryItemId,
        inventoryItemName,
        quantityReduced,
        quantityBefore,
        quantityAfter,
        reducedAt
      FROM inventory_reduction_history
      ORDER BY reducedAt DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM inventory_reduction_history');
    const total = countResult[0].total;

    res.json({
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      history
    });
  } catch (error) {
    console.error('Error fetching reduction history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get reduction history for specific patient
router.get('/history/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    const patientId = req.params.patientId;

    const [history] = await pool.query(`
      SELECT 
        id,
        appointmentId,
        patientId,
        patientName,
        appointmentType,
        inventoryItemId,
        inventoryItemName,
        quantityReduced,
        quantityBefore,
        quantityAfter,
        reducedAt
      FROM inventory_reduction_history
      WHERE patientId = ?
      ORDER BY reducedAt DESC
    `, [patientId]);

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get reduction history for specific appointment
router.get('/history/appointment/:appointmentId', authMiddleware, async (req, res) => {
  try {
    const appointmentId = req.params.appointmentId;

    const [history] = await pool.query(`
      SELECT 
        id,
        appointmentId,
        patientId,
        patientName,
        appointmentType,
        inventoryItemId,
        inventoryItemName,
        quantityReduced,
        quantityBefore,
        quantityAfter,
        reducedAt
      FROM inventory_reduction_history
      WHERE appointmentId = ?
      ORDER BY reducedAt DESC
    `, [appointmentId]);

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get reduction history for specific item
router.get('/history/item/:itemId', authMiddleware, async (req, res) => {
  try {
    const itemId = req.params.itemId;

    const [history] = await pool.query(`
      SELECT 
        id,
        appointmentId,
        patientId,
        patientName,
        appointmentType,
        inventoryItemId,
        inventoryItemName,
        quantityReduced,
        quantityBefore,
        quantityAfter,
        reducedAt
      FROM inventory_reduction_history
      WHERE inventoryItemId = ?
      ORDER BY reducedAt DESC
    `, [itemId]);

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process inventory reduction for completed appointment (called when appointment is marked as completed)
router.post('/auto-reduce/appointment/:appointmentId', authMiddleware, async (req, res) => {
  try {
    const appointmentId = req.params.appointmentId;

    // Get appointment details
    const [appointments] = await pool.query(
      'SELECT a.id, a.patientId, a.patientName, a.type as appointmentType FROM appointments WHERE id = ?',
      [appointmentId]
    );

    if (appointments.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = appointments[0];

    // Get auto-reduction rules for this appointment type
    const [ruleRows] = await pool.query(`
      SELECT r.id as ruleId, r.appointmentType, ri.id as itemId, ri.inventoryItemId, ri.quantityToReduce
      FROM inventory_auto_reduction_rules_v2 r
      LEFT JOIN inventory_auto_reduction_rule_items ri ON r.id = ri.ruleId
      WHERE r.appointmentType = ? AND r.isActive = TRUE
    `, [appointment.appointmentType]);

    if (ruleRows.length === 0 || !ruleRows[0].itemId) {
      return res.json({ message: 'No auto-reduction rules found for this appointment type' });
    }

    const reductionRecords = [];

    // Process each rule item
    for (const rule of ruleRows) {
      if (!rule.itemId || !rule.inventoryItemId) continue;

      // Get current inventory quantity
      const [inventoryItems] = await pool.query(
        'SELECT id, name, quantity FROM inventory WHERE id = ?',
        [rule.inventoryItemId]
      );

      if (inventoryItems.length === 0) continue;

      const item = inventoryItems[0];
      const quantityBefore = item.quantity;
      const quantityToReduce = Math.min(rule.quantityToReduce, quantityBefore);
      const quantityAfter = quantityBefore - quantityToReduce;

      // Update inventory quantity
      await pool.query(
        'UPDATE inventory SET quantity = ? WHERE id = ?',
        [quantityAfter, rule.inventoryItemId]
      );

      // Record the reduction in history
      const [historyResult] = await pool.query(`
        INSERT INTO inventory_reduction_history 
        (appointmentId, patientId, patientName, appointmentType, inventoryItemId, inventoryItemName, quantityReduced, quantityBefore, quantityAfter)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        appointmentId,
        appointment.patientId,
        appointment.patientName,
        appointment.appointmentType,
        rule.inventoryItemId,
        item.name,
        quantityToReduce,
        quantityBefore,
        quantityAfter
      ]);

      reductionRecords.push({
        itemId: rule.inventoryItemId,
        itemName: item.name,
        quantityReduced: quantityToReduce,
        quantityBefore,
        quantityAfter
      });
    }

    res.json({
      message: 'Inventory reduced successfully',
      appointmentId,
      reductionsApplied: reductionRecords.length,
      reductions: reductionRecords
    });
  } catch (error) {
    console.error('Error processing inventory auto-reduction:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
