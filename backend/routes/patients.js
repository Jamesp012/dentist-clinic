const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all patients
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [patients] = await pool.query('SELECT * FROM patients');
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get patient by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [patients] = await pool.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    if (patients.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patients[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create patient
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies } = req.body;
    const [result] = await pool.query(
      'INSERT INTO patients (name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, dateOfBirth, phone, email, address, sex, medicalHistory || '', allergies || '']
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update patient
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies } = req.body;
    await pool.query(
      'UPDATE patients SET name=?, dateOfBirth=?, phone=?, email=?, address=?, sex=?, medicalHistory=?, allergies=? WHERE id=?',
      [name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies, req.params.id]
    );
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete patient
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM patients WHERE id = ?', [req.params.id]);
    res.json({ message: 'Patient deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
