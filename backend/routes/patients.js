const express = require('express');
const bcryptjs = require('bcryptjs');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { sendPatientCredentials } = require('../utils/emailService');

const router = express.Router();

// Helper to generate random password
const generateRandomPassword = (length = 8) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let retVal = '';
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
};

// Helper to generate unique username
const generateUsername = async (fullName, email) => {
  let baseUsername = '';
  if (email) {
    baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  } else {
    baseUsername = fullName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
  }

  let username = baseUsername;
  let counter = 1;
  let isUnique = false;

  while (!isUnique) {
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length === 0) {
      isUnique = true;
    } else {
      username = `${baseUsername}${counter}`;
      counter++;
    }
  }
  return username;
};

// Get all patients
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Optimization: Don't fetch profilePhoto in the list view as it can be very large
    const [patients] = await pool.query('SELECT id, name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies, patientType, hasExistingRecord, lastVisit, nextAppointment, totalBalance FROM patients');
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
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const { name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies, profilePhoto, patientType, hasExistingRecord } = req.body;

    // 1. Generate username and temporary password
    const username = await generateUsername(name, email);
    const tempPassword = generateRandomPassword();
    const hashedPassword = await bcryptjs.hash(tempPassword, 10);

    // 2. Create user account
    const [userResult] = await connection.query(
      'INSERT INTO users (username, password, fullName, email, phone, role, isFirstLogin, accountStatus, accessLevel) VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, ?)',
      [username, hashedPassword, name, email || null, phone || null, 'patient', 'active', 'Default Accounts']
    );
    const userId = userResult.insertId;

    // 3. Create patient record linked to user
    const [result] = await connection.query(
      'INSERT INTO patients (user_id, name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies, profilePhoto, patientType, hasExistingRecord, has_account) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)',
      [userId, name, dateOfBirth, phone, email, address, sex, medicalHistory || '', allergies || '', profilePhoto || null, patientType || 'direct', hasExistingRecord || false]
    );

    await connection.commit();

    // 4. Email credentials disabled as requested
    /*
    if (email) {
      sendPatientCredentials(email, name, username, tempPassword);
    }
    */

    res.status(201).json({ 
      id: result.insertId, 
      userId,
      username,
      tempPassword,
      ...req.body 
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating patient and user:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Update patient
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies, profilePhoto, patientType, hasExistingRecord } = req.body;
    
    console.log('=== UPDATE PATIENT ===');
    console.log('Patient ID:', req.params.id);
    console.log('Request Body Keys:', Object.keys(req.body));
    console.log('ProfilePhoto received:', !!profilePhoto);
    console.log('ProfilePhoto length:', profilePhoto ? profilePhoto.length : 0);
    console.log('ProfilePhoto starts with:', profilePhoto ? profilePhoto.substring(0, 50) : 'N/A');
    
    const result = await pool.query(
      'UPDATE patients SET name=?, dateOfBirth=?, phone=?, email=?, address=?, sex=?, medicalHistory=?, allergies=?, profilePhoto=?, patientType=?, hasExistingRecord=? WHERE id=?',
      [name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies, profilePhoto || null, patientType || 'direct', hasExistingRecord || false, req.params.id]
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
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    // 1. Get user_id before deleting patient
    const [patients] = await connection.query('SELECT user_id FROM patients WHERE id = ?', [req.params.id]);
    
    if (patients.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Patient not found' });
    }

    const userId = patients[0].user_id;

    // 2. Delete patient record
    // This will trigger CASCADE/SET NULL on related tables (appointments, treatmentRecords, etc.)
    await connection.query('DELETE FROM patients WHERE id = ?', [req.params.id]);

    // 3. Delete associated user account if it exists
    if (userId) {
      await connection.query('DELETE FROM users WHERE id = ?', [userId]);
    }

    await connection.commit();
    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
