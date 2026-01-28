const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Helper to update patient balance
async function updatePatientBalance(patientId, connection) {
  const [records] = await connection.query(
    'SELECT SUM(remainingBalance) as totalBalance FROM treatmentRecords WHERE patientId = ?',
    [patientId]
  );
  
  const totalBalance = records[0].totalBalance || 0;
  
  await connection.query(
    'UPDATE patients SET totalBalance = ? WHERE id = ?',
    [totalBalance, patientId]
  );
}

// Get all treatment records
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [records] = await pool.query('SELECT * FROM treatmentRecords ORDER BY date DESC');
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get treatment records for a specific patient
router.get('/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    const [records] = await pool.query(
      'SELECT * FROM treatmentRecords WHERE patientId = ? ORDER BY date DESC',
      [req.params.patientId]
    );
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create treatment record
router.post('/', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { 
      patientId, date, treatment, tooth, notes, cost, dentist, 
      paymentType, amountPaid, remainingBalance, installmentPlan 
    } = req.body;
    
    const [result] = await connection.query(
      `INSERT INTO treatmentRecords 
      (patientId, date, treatment, tooth, notes, cost, dentist, paymentType, amountPaid, remainingBalance, installmentPlan) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId, date, treatment, tooth, notes, cost, dentist, 
        paymentType || 'full', amountPaid || 0, remainingBalance || 0, 
        installmentPlan ? JSON.stringify(installmentPlan) : null
      ]
    );

    await updatePatientBalance(patientId, connection);
    
    await connection.commit();
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Update treatment record
router.put('/:id', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { 
      patientId, date, treatment, tooth, notes, cost, dentist, 
      paymentType, amountPaid, remainingBalance, installmentPlan 
    } = req.body;
    
    await connection.query(
      `UPDATE treatmentRecords SET 
      date=?, treatment=?, tooth=?, notes=?, cost=?, dentist=?, 
      paymentType=?, amountPaid=?, remainingBalance=?, installmentPlan=? 
      WHERE id=?`,
      [
        date, treatment, tooth, notes, cost, dentist, 
        paymentType, amountPaid, remainingBalance, 
        installmentPlan ? JSON.stringify(installmentPlan) : null,
        req.params.id
      ]
    );

    await updatePatientBalance(patientId, connection);
    
    await connection.commit();
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Delete treatment record
router.delete('/:id', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Get patientId before deleting
    const [records] = await connection.query('SELECT patientId FROM treatmentRecords WHERE id = ?', [req.params.id]);
    if (records.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Record not found' });
    }
    const patientId = records[0].patientId;

    await connection.query('DELETE FROM treatmentRecords WHERE id = ?', [req.params.id]);
    
    await updatePatientBalance(patientId, connection);
    
    await connection.commit();
    res.json({ message: 'Record deleted' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
