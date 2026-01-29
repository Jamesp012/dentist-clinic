const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Helper function to format date as YYYY-MM-DD using local date parts
const formatDateString = (date) => {
  if (!date) return date;
  if (typeof date === 'string') {
    // If it's a string, just extract the date part
    return date.split('T')[0];
  }
  // For Date objects from MySQL, use local date parts to preserve the stored calendar date
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get all appointments
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [appointments] = await pool.query('SELECT * FROM appointments');
    // Convert DATE fields to ISO strings to prevent timezone issues
    const normalizedAppointments = appointments.map(apt => ({
      ...apt,
      date: formatDateString(apt.date)
    }));
    res.json(normalizedAppointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create appointment
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { patientId, patientName, date, time, type, notes } = req.body;
    // Ensure date is in YYYY-MM-DD format before inserting
    const normalizedDate = date ? date.split('T')[0] : date;
    const [result] = await pool.query(
      'INSERT INTO appointments (patientId, patientName, date, time, type, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [patientId, patientName, normalizedDate, time, type, 'scheduled', notes]
    );
    res.status(201).json({ 
      id: result.insertId, 
      patientId, 
      patientName, 
      date: normalizedDate, 
      time, 
      type, 
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
    const { patientId, patientName, date, time, type, status, notes } = req.body;
    // Ensure date is in YYYY-MM-DD format before updating
    const normalizedDate = date ? date.split('T')[0] : date;
    await pool.query(
      'UPDATE appointments SET patientId=?, patientName=?, date=?, time=?, type=?, status=?, notes=? WHERE id=?',
      [patientId, patientName, normalizedDate, time, type, status, notes, req.params.id]
    );
    res.json({ id: req.params.id, patientId, patientName, date: normalizedDate, time, type, status, notes });
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
