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
    const { patientId, patientName, referringDentist, referredTo, specialty, reason, date, urgency } = req.body;
    const [result] = await pool.query(
      'INSERT INTO referrals (patientId, patientName, referringDentist, referredTo, specialty, reason, date, urgency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [patientId, patientName, referringDentist, referredTo, specialty, reason, date, urgency]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update referral
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { patientId, patientName, referringDentist, referredTo, specialty, reason, date, urgency } = req.body;
    await pool.query(
      'UPDATE referrals SET patientId=?, patientName=?, referringDentist=?, referredTo=?, specialty=?, reason=?, date=?, urgency=? WHERE id=?',
      [patientId, patientName, referringDentist, referredTo, specialty, reason, date, urgency, req.params.id]
    );
    res.json({ id: req.params.id, ...req.body });
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
