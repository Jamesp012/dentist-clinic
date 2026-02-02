const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all referrals
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [referrals] = await pool.query('SELECT * FROM referrals');
    res.json(referrals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get referral by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [referrals] = await pool.query('SELECT * FROM referrals WHERE id = ?', [req.params.id]);
    if (referrals.length === 0) {
      return res.status(404).json({ error: 'Referral not found' });
    }
    res.json(referrals[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create referral
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { patientId, patientName, referringDentist, referredByContact, referredByEmail, referredTo, specialty, reason, selectedServices, date, urgency, createdByRole } = req.body;
    const roleValue = createdByRole === 'patient' ? 'patient' : 'staff';
    const servicesJson = selectedServices ? JSON.stringify(selectedServices) : null;
    const [result] = await pool.query(
      'INSERT INTO referrals (patientId, patientName, referringDentist, referredByContact, referredByEmail, referredTo, specialty, reason, selectedServices, date, urgency, createdByRole) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [patientId || null, patientName, referringDentist, referredByContact || null, referredByEmail || null, referredTo, specialty || null, reason || null, servicesJson, date, urgency || 'routine', roleValue]
    );
    res.status(201).json({ id: result.insertId, ...req.body, createdByRole: roleValue });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update referral
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { patientId, patientName, referringDentist, referredByContact, referredByEmail, referredTo, specialty, reason, selectedServices, date, urgency, createdByRole } = req.body;
    const roleValue = createdByRole === 'patient' ? 'patient' : 'staff';
    const servicesJson = selectedServices ? JSON.stringify(selectedServices) : null;
    await pool.query(
      'UPDATE referrals SET patientId=?, patientName=?, referringDentist=?, referredByContact=?, referredByEmail=?, referredTo=?, specialty=?, reason=?, selectedServices=?, date=?, urgency=?, createdByRole=? WHERE id=?',
      [patientId || null, patientName, referringDentist, referredByContact || null, referredByEmail || null, referredTo, specialty || null, reason || null, servicesJson, date, urgency || 'routine', roleValue, req.params.id]
    );
    res.json({ id: req.params.id, ...req.body, createdByRole: roleValue });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete referral
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM referrals WHERE id = ?', [req.params.id]);
    res.json({ message: 'Referral deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
