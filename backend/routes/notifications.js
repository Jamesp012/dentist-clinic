const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * PATIENT NOTIFICATIONS ROUTES
 * 
 * Handles notifications for patients about:
 * - Appointments created by doctors/staff
 * - Appointment updates
 * - Appointment cancellations
 * - Appointment reminders
 */

// Get all notifications for current patient
router.get('/', authMiddleware, async (req, res) => {
  try {
    // For patients: show only their own notifications
    // For staff: show all unread notifications (or filter by patient if patientId provided)
    let query = 'SELECT * FROM patient_notifications';
    let params = [];

    if (req.user.role === 'patient') {
      // Patient can only see their own notifications
      query += ' WHERE patientId = ?';
      params.push(req.user.patientId);
    } else if (req.query.patientId) {
      // Staff can filter by specific patient
      query += ' WHERE patientId = ?';
      params.push(req.query.patientId);
    }

    query += ' ORDER BY createdAt DESC';

    const [notifications] = await pool.query(query, params);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread notifications count
router.get('/unread/count', authMiddleware, async (req, res) => {
  try {
    let query = 'SELECT COUNT(*) as count FROM patient_notifications WHERE isRead = 0';
    let params = [];

    if (req.user.role === 'patient') {
      query += ' AND patientId = ?';
      params.push(req.user.patientId);
    } else if (req.query.patientId) {
      query += ' AND patientId = ?';
      params.push(req.query.patientId);
    }

    const [result] = await pool.query(query, params);
    res.json({ unreadCount: result[0].count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get notifications for specific patient (staff only)
router.get('/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'patient') {
      return res.status(403).json({ error: 'Patients can only view their own notifications' });
    }

    const [notifications] = await pool.query(
      'SELECT * FROM patient_notifications WHERE patientId = ? ORDER BY createdAt DESC',
      [req.params.patientId]
    );
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const [notification] = await pool.query(
      'SELECT * FROM patient_notifications WHERE id = ?',
      [req.params.id]
    );

    if (!notification.length) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Check authorization - patient can only update their own, staff can update any
    if (req.user.role === 'patient' && notification[0].patientId !== req.user.patientId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await pool.query(
      'UPDATE patient_notifications SET isRead = 1, readAt = NOW() WHERE id = ?',
      [req.params.id]
    );

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read for current patient
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'patient') {
      await pool.query(
        'UPDATE patient_notifications SET isRead = 1, readAt = NOW() WHERE patientId = ? AND isRead = 0',
        [req.user.patientId]
      );
    } else if (req.body.patientId) {
      // Staff can mark all as read for a specific patient
      await pool.query(
        'UPDATE patient_notifications SET isRead = 1, readAt = NOW() WHERE patientId = ? AND isRead = 0',
        [req.body.patientId]
      );
    }

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create notification (internal use - called from appointments route)
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Only staff can create notifications
    if (req.user.role !== 'doctor' && req.user.role !== 'assistant') {
      return res.status(403).json({ error: 'Only staff members can create notifications' });
    }

    const { patientId, appointmentId, type, title, message } = req.body;

    if (!patientId || !title || !message) {
      return res.status(400).json({ error: 'patientId, title, and message are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO patient_notifications (patientId, appointmentId, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [patientId, appointmentId || null, type || 'appointment_created', title, message]
    );

    res.status(201).json({
      id: result.insertId,
      patientId,
      appointmentId,
      type,
      title,
      message,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [notification] = await pool.query(
      'SELECT * FROM patient_notifications WHERE id = ?',
      [req.params.id]
    );

    if (!notification.length) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Check authorization - patient can only delete their own, staff can delete any
    if (req.user.role === 'patient' && notification[0].patientId !== req.user.patientId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await pool.query('DELETE FROM patient_notifications WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
