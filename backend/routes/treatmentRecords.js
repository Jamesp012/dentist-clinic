const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const {
  normalizeServiceList,
  serializeServices,
  parseStoredServices,
  applyInventoryAutoDeduction,
  restoreInventoryAutoDeduction,
} = require('../utils/inventoryAutoDeduction');

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
    const normalized = records.map(record => ({
      ...record,
      selectedServices: parseStoredServices(record.selectedServices),
      types: parseStoredServices(record.selectedServices),
    }));
    res.json(normalized);
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
    const normalized = records.map(record => ({
      ...record,
      selectedServices: parseStoredServices(record.selectedServices),
      types: parseStoredServices(record.selectedServices),
    }));
    res.json(normalized);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const { sanitizeTreatmentInput } = require('../utils/treatmentUtils');

// Create treatment record
router.post('/', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { patientId, date, treatment, tooth, notes, dentist } = req.body;
    const appointmentId = req.body.appointmentId ? Number(req.body.appointmentId) : null;
    const serviceList = normalizeServiceList(req.body.types || req.body.services || req.body.selectedServices);

    if (!patientId) {
      await connection.rollback();
      return res.status(400).json({ error: 'Patient is required for a treatment record.' });
    }

    if (serviceList.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Please select at least one service before recording the receipt.' });
    }

    const [patientRows] = await connection.query('SELECT name FROM patients WHERE id = ?', [patientId]);
    const patientName = patientRows[0]?.name || req.body.patientName || '';

    const sanitized = sanitizeTreatmentInput(req.body);

    const [result] = await connection.query(
      `INSERT INTO treatmentRecords 
      (patientId, appointmentId, date, treatment, tooth, notes, cost, dentist, paymentType, amountPaid, remainingBalance, installmentPlan, selectedServices) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        appointmentId,
        date,
        treatment,
        tooth,
        notes,
        sanitized.cost,
        dentist,
        sanitized.paymentType,
        sanitized.amountPaid,
        sanitized.remainingBalance,
        sanitized.installmentPlan,
        serializeServices(serviceList),
      ]
    );

    /* 
    // const deduction = await applyInventoryAutoDeduction(connection, {
      services: serviceList,
      appointmentId,
      treatmentRecordId: result.insertId,
      patientId,
      patientName,
    });

    if (deduction?.shortages && deduction.shortages.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        error: 'INSUFFICIENT_INVENTORY',
        shortages: deduction.shortages,
      });
    }
    */
    const deduction = null;

    await updatePatientBalance(patientId, connection);

    await connection.commit();

    const responsePayload = {
      id: result.insertId,
      patientId,
      appointmentId,
      date,
      treatment,
      type: treatment,
      tooth,
      notes,
      dentist,
      cost: sanitized.cost,
      paymentType: sanitized.paymentType,
      amountPaid: sanitized.amountPaid,
      remainingBalance: sanitized.remainingBalance,
      installmentPlan: sanitized.installmentPlan,
      selectedServices: serviceList,
      types: serviceList,
      inventoryDeduction: deduction,
    };

    res.status(201).json(responsePayload);
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

    const [existingRecords] = await connection.query('SELECT * FROM treatmentRecords WHERE id = ?', [req.params.id]);
    if (existingRecords.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Record not found' });
    }

    const existingRecord = existingRecords[0];
    const previousPatientId = existingRecord.patientId;

    const patientId = req.body.patientId ?? existingRecord.patientId;
    const date = req.body.date ?? existingRecord.date;
    const treatment = req.body.treatment ?? existingRecord.treatment;
    const tooth = req.body.tooth ?? existingRecord.tooth;
    const notes = req.body.notes ?? existingRecord.notes;
    const dentist = req.body.dentist ?? existingRecord.dentist;
    const appointmentId = req.body.appointmentId ?? existingRecord.appointmentId ?? null;
    const incomingServices = normalizeServiceList(req.body.types || req.body.services || req.body.selectedServices);
    const storedServices = parseStoredServices(existingRecord.selectedServices);
    const fallbackServices = storedServices.length > 0 ? storedServices : normalizeServiceList((existingRecord.treatment || '').split(','));
    const servicesToPersist = incomingServices.length > 0 ? incomingServices : fallbackServices;

    const servicesChanged = incomingServices.length > 0
      && JSON.stringify([...incomingServices].sort()) !== JSON.stringify([...fallbackServices].sort());

    const sanitized = sanitizeTreatmentInput(req.body, existingRecord);

    const [patientRows] = await connection.query('SELECT name FROM patients WHERE id = ?', [patientId]);
    const patientName = patientRows[0]?.name || req.body.patientName || '';

    await connection.query(
      `UPDATE treatmentRecords SET 
      patientId=?, appointmentId=?, date=?, treatment=?, tooth=?, notes=?, cost=?, dentist=?, 
      paymentType=?, amountPaid=?, remainingBalance=?, installmentPlan=?, selectedServices=? 
      WHERE id=?`,
      [
        patientId,
        appointmentId,
        date,
        treatment,
        tooth,
        notes,
        sanitized.cost,
        dentist,
        sanitized.paymentType,
        sanitized.amountPaid,
        sanitized.remainingBalance,
        sanitized.installmentPlan,
        serializeServices(servicesToPersist),
        req.params.id
      ]
    );

    let deductionSummary = null;

    if (servicesChanged) {
      await restoreInventoryAutoDeduction(connection, req.params.id);
      const deduction = await applyInventoryAutoDeduction(connection, {
        services: servicesToPersist,
        appointmentId,
        treatmentRecordId: req.params.id,
        patientId,
        patientName,
      });

      if (deduction?.shortages && deduction.shortages.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'INSUFFICIENT_INVENTORY', shortages: deduction.shortages });
      }

      deductionSummary = deduction;
    } else if ((existingRecord.appointmentId ?? null) !== (appointmentId ?? null)) {
      await connection.query('UPDATE inventory_reduction_history SET appointmentId = ? WHERE treatmentRecordId = ?', [appointmentId, req.params.id]);
    }

    await updatePatientBalance(patientId, connection);
    if (previousPatientId && previousPatientId !== patientId) {
      await updatePatientBalance(previousPatientId, connection);
    }

    await connection.commit();

    const responsePayload = {
      ...existingRecord,
      ...req.body,
      id: req.params.id,
      patientId,
      appointmentId,
      date,
      treatment,
      type: treatment,
      tooth,
      notes,
      dentist,
      cost: sanitized.cost,
      paymentType: sanitized.paymentType,
      amountPaid: sanitized.amountPaid,
      remainingBalance: sanitized.remainingBalance,
      installmentPlan: sanitized.installmentPlan,
      selectedServices: servicesToPersist,
      types: servicesToPersist,
      inventoryDeduction: deductionSummary,
    };

    res.json(responsePayload);
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
