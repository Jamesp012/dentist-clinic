const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all patients
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [patients] = await pool.query('SELECT * FROM patients');
    console.log('Fetching all patients - Count:', patients.length);
    if (patients.length > 0) {
      console.log('First patient has profilePhoto:', !!patients[0].profilePhoto);
    }
    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
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
    const { name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies, profilePhoto } = req.body;
    const [result] = await pool.query(
      'INSERT INTO patients (name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies, profilePhoto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, dateOfBirth, phone, email, address, sex, medicalHistory || '', allergies || '', profilePhoto || null]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update patient
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies, profilePhoto } = req.body;
    
    console.log('=== UPDATE PATIENT ===');
    console.log('Patient ID:', req.params.id);
    console.log('Request Body Keys:', Object.keys(req.body));
    console.log('ProfilePhoto received:', !!profilePhoto);
    console.log('ProfilePhoto length:', profilePhoto ? profilePhoto.length : 0);
    console.log('ProfilePhoto starts with:', profilePhoto ? profilePhoto.substring(0, 50) : 'N/A');
    
    const result = await pool.query(
      'UPDATE patients SET name=?, dateOfBirth=?, phone=?, email=?, address=?, sex=?, medicalHistory=?, allergies=?, profilePhoto=? WHERE id=?',
      [name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies, profilePhoto || null, req.params.id]
    );
    
    console.log('Update result - Rows affected:', result[0].affectedRows);
    
    // Verify the update
    const [updated] = await pool.query('SELECT id, name, profilePhoto FROM patients WHERE id = ?', [req.params.id]);
    console.log('Verification - Patient now has photo:', !!updated[0]?.profilePhoto);
    console.log('=== END UPDATE ===\n');
    
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    console.error('❌ Error updating patient:', error);
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
