const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Helper to update treatment record balance
async function updateTreatmentBalance(treatmentRecordId, connection) {
  if (!treatmentRecordId) return;

  const [records] = await connection.query(
    'SELECT cost FROM treatmentRecords WHERE id = ?',
    [treatmentRecordId]
  );
  
  if (records.length === 0) return;
  const cost = records[0].cost;

  const [payments] = await connection.query(
    'SELECT SUM(amount) as totalPaid FROM payments WHERE treatmentRecordId = ?',
    [treatmentRecordId]
  );
  
  const totalPaid = payments[0].totalPaid || 0;
  const remainingBalance = Math.max(0, cost - totalPaid);
  
  await connection.query(
    'UPDATE treatmentRecords SET amountPaid = ?, remainingBalance = ? WHERE id = ?',
    [totalPaid, remainingBalance, treatmentRecordId]
  );

  // Also update patient balance
  const [tr] = await connection.query('SELECT patientId FROM treatmentRecords WHERE id = ?', [treatmentRecordId]);
  if (tr.length > 0) {
    await updatePatientBalance(tr[0].patientId, connection);
  }
}

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

// Get all payments
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [payments] = await pool.query('SELECT * FROM payments ORDER BY paymentDate DESC');
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create payment
router.post('/', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { 
      patientId, treatmentRecordId, amount, paymentDate, 
      paymentMethod, status, notes, recordedBy 
    } = req.body;
    
    const [result] = await connection.query(
      `INSERT INTO payments 
      (patientId, treatmentRecordId, amount, paymentDate, paymentMethod, status, notes, recordedBy) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [patientId, treatmentRecordId || null, amount, paymentDate, paymentMethod, status || 'paid', notes, recordedBy]
    );

    if (treatmentRecordId) {
      await updateTreatmentBalance(treatmentRecordId, connection);
    } else {
      await updatePatientBalance(patientId, connection);
    }
    
    await connection.commit();
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Delete payment
router.delete('/:id', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const [payments] = await connection.query('SELECT patientId, treatmentRecordId FROM payments WHERE id = ?', [req.params.id]);
    if (payments.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Payment not found' });
    }
    const { patientId, treatmentRecordId } = payments[0];

    await connection.query('DELETE FROM payments WHERE id = ?', [req.params.id]);
    
    if (treatmentRecordId) {
      await updateTreatmentBalance(treatmentRecordId, connection);
    } else {
      await updatePatientBalance(patientId, connection);
    }
    
    await connection.commit();
    res.json({ message: 'Payment deleted' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
