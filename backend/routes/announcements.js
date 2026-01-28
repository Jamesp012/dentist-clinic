const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all announcements (patients + staff)
router.get('/', authMiddleware, async (_req, res) => {
  try {
    const [announcements] = await pool.query(
      'SELECT * FROM announcements ORDER BY date DESC, createdAt DESC'
    );
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create announcement (staff only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, message, type } = req.body;

    if (!title || !message || !type) {
      return res.status(400).json({ error: 'Title, message, and type are required' });
    }

    if (req.user.role !== 'assistant' && req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only staff members can post announcements' });
    }

    const announcementDate = req.body.date || new Date().toISOString().split('T')[0];
    const createdBy = req.user.fullName || req.user.username || req.user.role;

    const [result] = await pool.query(
      'INSERT INTO announcements (title, message, type, date, createdBy) VALUES (?, ?, ?, ?, ?)',
      [title, message, type, announcementDate, createdBy]
    );

    const [rows] = await pool.query('SELECT * FROM announcements WHERE id = ?', [result.insertId]);
    const createdAnnouncement = rows[0];

    res.status(201).json(createdAnnouncement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete announcement (staff only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'assistant' && req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only staff members can delete announcements' });
    }

    const { id } = req.params;
    await pool.query('DELETE FROM announcements WHERE id = ?', [id]);
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
