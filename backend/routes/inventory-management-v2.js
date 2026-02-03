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
          ELSE 'normal'
        END as status
      FROM inventory
      WHERE quantity = 0 OR quantity <= minQuantity
      ORDER BY quantity ASC
    `);

    res.json({ alerts: items });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== APPOINTMENT TYPES / SERVICES ENDPOINT ====================

// Get all unique appointment types (services)
router.get('/appointment-types', authMiddleware, async (req, res) => {
  try {
    const [types] = await pool.query(`
      SELECT DISTINCT type as appointmentType
      FROM appointments
      WHERE type IS NOT NULL AND type != ''
      ORDER BY type ASC
    `);

    const appointmentTypes = types.map(t => t.appointmentType);
    res.json({ appointmentTypes });
  } catch (error) {
    console.error('Error fetching appointment types:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== AUTO-REDUCTION RULES ENDPOINTS ====================

// Get all auto-reduction rules with their items
router.get('/auto-reduction/rules', authMiddleware, async (req, res) => {
  try {
    // Get all rules
    const [rules] = await pool.query(`
      SELECT 
        id,
        appointmentType,
        isActive,
        createdAt,
        updatedAt
      FROM inventory_auto_reduction_rules_v2
      ORDER BY appointmentType ASC
    `);

    // For each rule, get its items
    const formattedRules = [];
    for (const rule of rules) {
      const [items] = await pool.query(`
        SELECT 
          ri.id as itemId,
          ri.inventoryItemId,
          i.name as itemName,
          ri.quantityToReduce
        FROM inventory_auto_reduction_rule_items ri
        LEFT JOIN inventory i ON ri.inventoryItemId = i.id
        WHERE ri.ruleId = ?
      `, [rule.id]);

      formattedRules.push({
        ...rule,
        items: items || []
      });
    }

    res.json(formattedRules);
  } catch (error) {
    console.error('Error fetching auto-reduction rules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get rules by appointment type
router.get('/auto-reduction/rules/:appointmentType', authMiddleware, async (req, res) => {
  try {
    const { appointmentType } = req.params;

    const [rules] = await pool.query(`
      SELECT 
        r.id,
        r.appointmentType,
        ri.inventoryItemId,
        i.name as inventoryItemName,
        ri.quantityToReduce,
        i.quantity as currentQuantity,
        r.isActive
      FROM inventory_auto_reduction_rules_v2 r
      LEFT JOIN inventory_auto_reduction_rule_items ri ON r.id = ri.ruleId
      LEFT JOIN inventory i ON ri.inventoryItemId = i.id
      WHERE r.appointmentType = ?
      ORDER BY i.name ASC
    `, [appointmentType]);

    res.json(rules);
  } catch (error) {
    console.error('Error fetching rules by type:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new auto-reduction rule with multiple items
router.post('/auto-reduction/rules', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { appointmentType, items: newItems } = req.body;

    if (!appointmentType || !Array.isArray(newItems) || newItems.length === 0) {
      return res.status(400).json({ 
        error: 'appointmentType and items array are required' 
      });
    }

    // Start transaction
    await connection.beginTransaction();

    // Create rule
    const [ruleResult] = await connection.query(`
      INSERT INTO inventory_auto_reduction_rules_v2 (appointmentType, isActive)
      VALUES (?, TRUE)
    `, [appointmentType]);

    const ruleId = ruleResult.insertId;

    // Insert items
    for (const item of newItems) {
      await connection.query(`
        INSERT INTO inventory_auto_reduction_rule_items (ruleId, inventoryItemId, quantityToReduce)
        VALUES (?, ?, ?)
      `, [ruleId, item.itemId, item.quantityToReduce || 1]);
    }

    await connection.commit();

    // Return created rule with items
    const [ruleData] = await connection.query(`
      SELECT 
        id,
        appointmentType,
        isActive,
        createdAt,
        updatedAt
      FROM inventory_auto_reduction_rules_v2
      WHERE id = ?
    `, [ruleId]);

    const [items] = await connection.query(`
      SELECT 
        id as itemId,
        inventoryItemId,
        quantityToReduce
      FROM inventory_auto_reduction_rule_items
      WHERE ruleId = ?
    `, [ruleId]);

    const rule = { ...ruleData[0], items };
    res.json(rule);
  } catch (error) {
    await connection.rollback();
    console.error('Error creating auto-reduction rule:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Update auto-reduction rule (update items)
router.put('/auto-reduction/rules/:ruleId', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { ruleId } = req.params;
    const { items: newItems } = req.body;

    if (!Array.isArray(newItems)) {
      return res.status(400).json({ error: 'items array is required' });
    }

    await connection.beginTransaction();

    // Delete old items
    await connection.query(`
      DELETE FROM inventory_auto_reduction_rule_items WHERE ruleId = ?
    `, [ruleId]);

    // Insert new items
    for (const item of newItems) {
      await connection.query(`
        INSERT INTO inventory_auto_reduction_rule_items (ruleId, inventoryItemId, quantityToReduce)
        VALUES (?, ?, ?)
      `, [ruleId, item.itemId, item.quantityToReduce || 1]);
    }

    await connection.commit();

    // Return updated rule
    const [ruleData] = await connection.query(`
      SELECT 
        id,
        appointmentType,
        isActive,
        createdAt,
        updatedAt
      FROM inventory_auto_reduction_rules_v2
      WHERE id = ?
    `, [ruleId]);

    const [items] = await connection.query(`
      SELECT 
        id as itemId,
        inventoryItemId,
        quantityToReduce
      FROM inventory_auto_reduction_rule_items
      WHERE ruleId = ?
    `, [ruleId]);

    const rule = { ...ruleData[0], items };
    res.json(rule);
  } catch (error) {
    await connection.rollback();
    console.error('Error updating auto-reduction rule:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Delete auto-reduction rule
router.delete('/auto-reduction/rules/:ruleId', authMiddleware, async (req, res) => {
  try {
    const { ruleId } = req.params;

    const [result] = await pool.query(`
      DELETE FROM inventory_auto_reduction_rules_v2 WHERE id = ?
    `, [ruleId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({ message: 'Rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting auto-reduction rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset all auto-reduction rules
router.post('/auto-reduction/reset', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.query(`
      DELETE FROM inventory_auto_reduction_rule_items
    `);

    const [result2] = await pool.query(`
      DELETE FROM inventory_auto_reduction_rules_v2
    `);

    res.json({ 
      message: 'All rules reset successfully',
      itemsDeleted: result.affectedRows,
      rulesDeleted: result2.affectedRows
    });
  } catch (error) {
    console.error('Error resetting rules:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== REDUCTION HISTORY ENDPOINTS ====================

// Get all reduction history with pagination
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = parseInt(req.query.offset) || 0;

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
    `, [limit, offset]);

    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total FROM inventory_reduction_history
    `);

    res.json({
      history,
      total: countResult[0].total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching reduction history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get reduction history by patient
router.get('/history/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;

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
    console.error('Error fetching history by patient:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get reduction history by appointment
router.get('/history/appointment/:appointmentId', authMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.params;

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
    console.error('Error fetching history by appointment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get reduction history by item
router.get('/history/item/:itemId', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.params;

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
    console.error('Error fetching history by item:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== AUTO-REDUCE EXECUTION ENDPOINT ====================

// Execute auto-reduce for appointment
router.post('/auto-reduce/appointment/:appointmentId', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { appointmentId } = req.params;

    // Get appointment details
    const [appointments] = await connection.query(`
      SELECT id, patientId, patientName, type FROM appointments WHERE id = ?
    `, [appointmentId]);

    if (appointments.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = appointments[0];
    const appointmentType = appointment.type;

    // Get reduction rules for this appointment type
    const [rules] = await connection.query(`
      SELECT ri.inventoryItemId, ri.quantityToReduce, i.name as itemName
      FROM inventory_auto_reduction_rules_v2 r
      JOIN inventory_auto_reduction_rule_items ri ON r.id = ri.ruleId
      JOIN inventory i ON ri.inventoryItemId = i.id
      WHERE r.appointmentType = ? AND r.isActive = TRUE
    `, [appointmentType]);

    const reductionRecords = [];

    // Apply reductions
    for (const rule of rules) {
      // Get current quantity
      const [items] = await connection.query(`
        SELECT quantity FROM inventory WHERE id = ?
      `, [rule.inventoryItemId]);

      if (items.length === 0) continue;

      const currentQuantity = items[0].quantity;
      const newQuantity = Math.max(0, currentQuantity - rule.quantityToReduce);

      // Update inventory
      await connection.query(`
        UPDATE inventory SET quantity = ? WHERE id = ?
      `, [newQuantity, rule.inventoryItemId]);

      // Record in history
      await connection.query(`
        INSERT INTO inventory_reduction_history 
        (appointmentId, patientId, patientName, appointmentType, inventoryItemId, inventoryItemName, quantityReduced, quantityBefore, quantityAfter)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        appointmentId,
        appointment.patientId,
        appointment.patientName,
        appointmentType,
        rule.inventoryItemId,
        rule.itemName,
        rule.quantityToReduce,
        currentQuantity,
        newQuantity
      ]);

      reductionRecords.push({
        itemId: rule.inventoryItemId,
        itemName: rule.itemName,
        quantityReduced: rule.quantityToReduce,
        before: currentQuantity,
        after: newQuantity
      });
    }

    res.json({
      appointmentId,
      reductionsApplied: reductionRecords.length,
      reductions: reductionRecords
    });
  } catch (error) {
    console.error('Error processing inventory auto-reduction:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
