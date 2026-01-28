const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all photos
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [photos] = await pool.query('SELECT * FROM photos ORDER BY date DESC');
    res.json(photos);
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get photos for a specific patient
router.get('/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    const [photos] = await pool.query(
      'SELECT * FROM photos WHERE patientId = ? ORDER BY date DESC',
      [req.params.patientId]
    );
    res.json(photos);
  } catch (error) {
    console.error('Error fetching patient photos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload photo
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { patientId, type, url, date, notes, treatmentId } = req.body;

    if (!patientId || !type || !url) {
      return res.status(400).json({ error: 'Missing required fields: patientId, type, url' });
    }

    // Validate type
    if (!['before', 'after', 'xray'].includes(type)) {
      return res.status(400).json({ error: 'Invalid photo type. Must be before, after, or xray' });
    }

    const photoDate = date || new Date().toISOString().split('T')[0];

    const [result] = await pool.query(
      'INSERT INTO photos (patientId, type, url, date, notes, treatmentId) VALUES (?, ?, ?, ?, ?, ?)',
      [patientId, type, url, photoDate, notes || null, treatmentId || null]
    );

    res.status(201).json({
      id: result.insertId,
      patientId,
      type,
      url,
      date: photoDate,
      notes: notes || null,
      treatmentId: treatmentId || null
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update photo
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { type, url, notes } = req.body;

    if (!type && !url && notes === undefined) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updateFields = [];
    const updateValues = [];

    if (type) {
      updateFields.push('type = ?');
      updateValues.push(type);
    }
    if (url) {
      updateFields.push('url = ?');
      updateValues.push(url);
    }
    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }

    updateValues.push(req.params.id);

    await pool.query(
      `UPDATE photos SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    res.json({ message: 'Photo updated successfully' });
  } catch (error) {
    console.error('Error updating photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete photo
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM photos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
