const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all appointments
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [appointments] = await pool.query('SELECT * FROM appointments');
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create appointment
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { patientId, patientName, date, time, type, duration, notes } = req.body;
    const [result] = await pool.query(
      'INSERT INTO appointments (patientId, patientName, date, time, type, duration, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [patientId, patientName, date, time, type, duration, 'scheduled', notes]
    );
    res.status(201).json({ 
      id: result.insertId, 
      patientId, 
      patientName, 
      date, 
      time, 
      type, 
      duration, 
      notes,
      status: 'scheduled' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update appointment
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { patientId, patientName, date, time, type, duration, status, notes } = req.body;
    await pool.query(
      'UPDATE appointments SET patientId=?, patientName=?, date=?, time=?, type=?, duration=?, status=?, notes=? WHERE id=?',
      [patientId, patientName, date, time, type, duration, status, notes, req.params.id]
    );
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete appointment
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM appointments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Appointment deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
