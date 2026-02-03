const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all prescriptions
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [prescriptions] = await pool.query('SELECT * FROM prescriptions ORDER BY createdAt DESC');
    res.json(prescriptions.map(p => ({
      ...p,
      medications: p.medications ? JSON.parse(p.medications) : []
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get prescriptions by patient ID
router.get('/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    const [prescriptions] = await pool.query(
      'SELECT * FROM prescriptions WHERE patientId = ? ORDER BY createdAt DESC',
      [req.params.patientId]
    );
    res.json(prescriptions.map(p => ({
      ...p,
      medications: p.medications ? JSON.parse(p.medications) : []
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get prescription by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [prescriptions] = await pool.query(
      'SELECT * FROM prescriptions WHERE id = ?',
      [req.params.id]
    );
    if (prescriptions.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    const prescription = prescriptions[0];
    res.json({
      ...prescription,
      medications: prescription.medications ? JSON.parse(prescription.medications) : []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create prescription
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { patientId, patientName, dentist, licenseNumber, ptrNumber, medications, notes, date } = req.body;
    
    if (!patientId || !dentist || !medications) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const medicationsJson = JSON.stringify(medications);
    const [result] = await pool.query(
      'INSERT INTO prescriptions (patientId, patientName, dentist, licenseNumber, ptrNumber, medications, notes, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [patientId, patientName || '', dentist, licenseNumber || null, ptrNumber || null, medicationsJson, notes || '', date || new Date().toISOString().split('T')[0]]
    );
    
    res.status(201).json({
      id: result.insertId,
      patientId,
      patientName,
      dentist,
      licenseNumber,
      ptrNumber,
      medications,
      notes,
      date,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update prescription
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { patientId, patientName, dentist, licenseNumber, ptrNumber, medications, notes, date } = req.body;
    
    const medicationsJson = medications ? JSON.stringify(medications) : null;
    const [result] = await pool.query(
      'UPDATE prescriptions SET patientId=?, patientName=?, dentist=?, licenseNumber=?, ptrNumber=?, medications=?, notes=?, date=? WHERE id=?',
      [patientId, patientName || '', dentist, licenseNumber || null, ptrNumber || null, medicationsJson, notes || '', date, req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    
    res.json({
      id: req.params.id,
      patientId,
      patientName,
      dentist,
      licenseNumber,
      ptrNumber,
      medications,
      notes,
      date
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete prescription
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM prescriptions WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    res.json({ message: 'Prescription deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
