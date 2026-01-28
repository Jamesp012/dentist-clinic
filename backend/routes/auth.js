const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password, fullName, email, role, phone, dateOfBirth, sex, address } = req.body;

    // Check if user exists
    const [existingUser] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (username, password, fullName, email, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, fullName, email, role, phone]
    );

    // If patient role, create patient record with has_account = true
    if (role === 'patient') {
      await pool.query(
        'INSERT INTO patients (user_id, name, dateOfBirth, phone, email, sex, address, has_account) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)',
        [result.insertId, fullName, dateOfBirth, phone, email, sex, address]
      );
    }

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password
    const passwordMatch = await bcryptjs.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // If this is first login with pending status, mark as active and code as used
    if (user.isFirstLogin && user.accountStatus === 'pending') {
      await pool.query('UPDATE users SET accountStatus = ? WHERE id = ?', ['active', user.id]);
      // Also mark the employee's code as used
      await pool.query('UPDATE employees SET isCodeUsed = TRUE WHERE user_id = ?', [user.id]);
    }

    // Look up linked patient record (if any)
    let patientId = null;
    try {
      const [patients] = await pool.query('SELECT id FROM patients WHERE user_id = ? LIMIT 1', [user.id]);
      if (patients.length > 0) {
        patientId = patients[0].id;
      }
    } catch (err) {
      console.error('Failed to fetch patientId for user', err);
    }

    // For newly registered patients who don't have a patient record yet, create one automatically
    if (user.role === 'patient' && !patientId) {
      try {
        const [result] = await pool.query(
          'INSERT INTO patients (user_id, name, phone, email, has_account) VALUES (?, ?, ?, ?, TRUE)',
          [
            user.id,
            user.fullName || user.username,
            user.phone || null,
            user.email || null,
          ],
        );
        patientId = result.insertId;
      } catch (createErr) {
        console.error('Failed to auto-create patient record for user', createErr);
      }
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.fullName, email: user.email, patientId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        fullName: user.fullName, 
        email: user.email,
        isFirstLogin: user.isFirstLogin,
        patientId
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password (for first-time login)
router.post('/change-password', async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    // Hash new password
    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    // Update password and set isFirstLogin to false
    await pool.query(
      'UPDATE users SET password = ?, isFirstLogin = FALSE WHERE id = ?',
      [hashedPassword, userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check username availability
router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    // Check if username exists across all roles
    const [users] = await pool.query('SELECT id FROM users WHERE username = ?', [username.trim()]);
    
    res.json({ available: users.length === 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user settings (NO AUTH - direct call with userId in body)
router.put('/update-settings', async (req, res) => {
  try {
    const { userId, fullName, username, currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get current user
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // If password change is requested, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }

      const passwordMatch = await bcryptjs.compare(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    // If username is being changed, check availability
    if (username && username !== user.username) {
      const [existingUser] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (fullName) {
      updates.push('fullName = ?');
      values.push(fullName);
    }

    if (username && username !== user.username) {
      updates.push('username = ?');
      values.push(username);
    }

    if (newPassword) {
      const hashedPassword = await bcryptjs.hash(newPassword, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    // If there are updates to make
    if (updates.length > 0) {
      values.push(userId);
      await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      // Also update employee record if exists (name field)
      if (fullName) {
        await pool.query('UPDATE employees SET name = ? WHERE user_id = ?', [fullName, userId]);
      }
    }

    // Get updated user
    const [updatedUsers] = await pool.query('SELECT id, username, fullName, email, role FROM users WHERE id = ?', [userId]);
    
    res.json({ 
      message: 'Settings updated successfully',
      user: updatedUsers[0]
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// TEMPORARY: Reset doctor user (for development only)
router.post('/reset-doctor', async (req, res) => {
  try {
    const bcryptjs = require('bcryptjs');
    const hash = await bcryptjs.hash('doctor123', 10);
    
    // Delete old records
    await pool.query('DELETE FROM employees WHERE user_id IN (SELECT id FROM users WHERE username=?)', ['doctor']);
    await pool.query('DELETE FROM users WHERE username=?', ['doctor']);
    
    // Create new user
    const [result] = await pool.query(
      'INSERT INTO users (username,password,fullName,email,phone,role,position,isFirstLogin,accountStatus) VALUES (?,?,?,?,?,?,?,?,?)',
      ['doctor', hash, 'Dr. Joseph Maaño', 'doctor@clinic.com', '+63-9123-456-789', 'doctor', 'dentist', false, 'active']
    );
    
    // Create employee record
    await pool.query(
      'INSERT INTO employees (user_id,name,position,phone,email,address,dateHired,isCodeUsed) VALUES (?,?,?,?,?,?,?,?)',
      [result.insertId, 'Dr. Joseph Maaño', 'dentist', '+63-9123-456-789', 'doctor@clinic.com', '123 Medical Plaza', '2020-01-15', true]
    );
    
    res.json({ message: 'Doctor reset successfully. Login with: doctor / doctor123' });
  } catch (error) {
    console.error('Reset doctor error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

