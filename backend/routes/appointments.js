const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Helper function to parse date and time into DATETIME format
// Accepts: "2025-02-06" and "10:00" or full "2025-02-06 10:00:00" format
const parseAppointmentDateTime = (dateStr, timeStr) => {
  if (!dateStr) return null;
  
  // If already contains space (DATETIME format), use as is
  if (dateStr.includes(' ')) {
    return dateStr;
  }
  
  // Combine date and time: YYYY-MM-DD + HH:MM -> YYYY-MM-DD HH:MM:00
  const time = timeStr || '09:00';
  return `${dateStr} ${time}:00`;
};

// Helper function to extract date and time from DATETIME
const extractDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return { date: null, time: null };
  
  const parts = dateTimeStr.split(' ');
  return {
    date: parts[0], // YYYY-MM-DD
    time: parts[1] ? parts[1].substring(0, 5) : '09:00' // HH:MM
  };
};

// Get all appointments
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [appointments] = await pool.query(
      'SELECT * FROM appointments ORDER BY appointmentDateTime ASC'
    );
    // Return with both DATETIME and split date/time for compatibility
    const formattedAppointments = appointments.map(apt => {
      const { date, time } = extractDateTime(apt.appointmentDateTime);
      return {
        ...apt,
        date,
        time
      };
    });
    res.json(formattedAppointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create appointment
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { patientId, patientName, date, time, type, duration = 60, notes, createdByRole } = req.body;
    const appointmentDateTime = parseAppointmentDateTime(date, time);
    const roleValue = createdByRole === 'patient' ? 'patient' : 'staff';
    
    const [result] = await pool.query(
      'INSERT INTO appointments (patientId, patientName, appointmentDateTime, type, duration, status, notes, createdByRole) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [patientId, patientName, appointmentDateTime, type, duration, 'scheduled', notes, roleValue]
    );
    
    const { date: dateOnly, time: timeOnly } = extractDateTime(appointmentDateTime);
    
    res.status(201).json({ 
      id: result.insertId, 
      patientId, 
      patientName, 
      date: dateOnly,
      time: timeOnly,
      appointmentDateTime,
      type, 
      duration,
      notes,
      status: 'scheduled',
      createdByRole: roleValue
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update appointment
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { patientId, patientName, date, time, type, duration = 60, status, notes, createdByRole } = req.body;
    const appointmentDateTime = parseAppointmentDateTime(date, time);
    const roleValue = createdByRole === 'patient' ? 'patient' : 'staff';
    
    await pool.query(
      'UPDATE appointments SET patientId=?, patientName=?, appointmentDateTime=?, type=?, duration=?, status=?, notes=?, createdByRole=? WHERE id=?',
      [patientId, patientName, appointmentDateTime, type, duration, status, notes, roleValue, req.params.id]
    );
    
    const { date: dateOnly, time: timeOnly } = extractDateTime(appointmentDateTime);
    
    res.json({ 
      id: req.params.id, 
      patientId, 
      patientName, 
      date: dateOnly,
      time: timeOnly,
      appointmentDateTime,
      type, 
      duration, 
      status, 
      notes,
      createdByRole: roleValue
    });
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
