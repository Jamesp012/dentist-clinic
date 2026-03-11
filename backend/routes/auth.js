const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { sendPatientCredentials, sendVerificationOTP } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const { username, password, fullName, email, role, phone, dateOfBirth, sex, address, otp } = req.body;

    // Check if email verification is required (only for patients self-registering)
    if (role === 'patient') {
      if (!otp) {
        await connection.rollback();
        return res.status(400).json({ error: 'Email verification code is required' });
      }

      const [otps] = await connection.query(
        'SELECT * FROM otp_verifications WHERE email = ? AND otp = ? AND type = "email" AND expiresAt > UTC_TIMESTAMP() AND verified = FALSE',
        [email, otp]
      );

      if (otps.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Invalid or expired verification code' });
      }

      // Mark OTP as verified
      await connection.query('UPDATE otp_verifications SET verified = TRUE WHERE id = ?', [otps[0].id]);
    }

    // Check if username exists
    const [existingUser] = await connection.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Check if email exists (for patients)
    if (email && role === 'patient') {
      const [existingEmail] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existingEmail.length > 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'An account with this email already exists. Please log in or reset your password.' });
      }
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create user
    const [result] = await connection.query(
      'INSERT INTO users (username, password, fullName, email, role, phone, isFirstLogin, accessLevel) VALUES (?, ?, ?, ?, ?, ?, FALSE, ?)',
      [username, hashedPassword, fullName, email, role, phone, 'Default Accounts']
    );
    const userId = result.insertId;

    // If patient role, create patient record with has_account = true
    if (role === 'patient') {
      await connection.query(
        'INSERT INTO patients (user_id, name, dateOfBirth, phone, email, sex, address, has_account) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)',
        [userId, fullName, dateOfBirth, phone, email, sex, address]
      );
    }

    await connection.commit();

    // Send welcome email (using the same credentials utility but it serves as welcome)
    if (email && role === 'patient') {
      // For self-registered patients, we just send a welcome note with their chosen username
      // We don't send the password back for security, but we confirm their account is ready
      sendPatientCredentials(email, fullName, username, '******** (the password you chose during signup)');
    }

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
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
      { id: user.id, username: user.username, role: user.role, fullName: user.fullName, email: user.email, patientId, accessLevel: user.accessLevel },
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
        accessLevel: user.accessLevel,
        isFirstLogin: user.isFirstLogin,
        patientId
      } 
    });
  } catch (error) {
    console.error('Auth route error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
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
    console.error('Auth route error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
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
    console.error('Auth route error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Check email availability
router.get('/check-email', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if email exists across all roles
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim()]);
    
    res.json({ available: users.length === 0 });
  } catch (error) {
    console.error('Auth route error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
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
      ['doctor', hash, 'Dr. Joseph Maaño', 'dentalclinic@maañodentalcare.com', '+63-9123-456-789', 'doctor', 'dentist', false, 'active']
    );
    
    // Create employee record
    await pool.query(
      'INSERT INTO employees (user_id,name,position,phone,email,address,dateHired,isCodeUsed) VALUES (?,?,?,?,?,?,?,?)',
      [result.insertId, 'Dr. Joseph Maaño', 'dentist', '+63-9123-456-789', 'dentalclinic@maañodentalcare.com', '123 Medical Plaza', '2020-01-15', true]
    );
    
    res.json({ message: 'Doctor reset successfully. Login with: doctor / doctor123' });
  } catch (error) {
    console.error('Reset doctor error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Find user by username
    const [users] = await pool.query('SELECT id, phone, fullName FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    if (!user.phone) {
      return res.status(400).json({ error: 'No phone number associated with this account. Please contact the clinic.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in database
    await pool.query('DELETE FROM otp_verifications WHERE phone = ? AND type = "phone"', [user.phone]);
    await pool.query(
      'INSERT INTO otp_verifications (phone, otp, expiresAt, verified, type) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE), FALSE, "phone")',
      [user.phone, otp]
    );

    // Send SMS
    const smsResult = await sendSMS(user.phone, `Your ${process.env.PHILSMS_SENDER_NAME || 'PhilSMS'} verification code for password reset is: ${otp}. Valid for 10 minutes.`);

    if (smsResult.success) {
      // Mask phone number for security
      const maskedPhone = user.phone.replace(/(\d{3})\d+(\d{4})/, '$1****$2');
      res.json({ 
        message: 'OTP sent successfully', 
        phone: maskedPhone,
        userId: user.id 
      });
    } else {
      res.status(500).json({ error: 'Failed to send OTP via SMS', details: smsResult.error });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Request Signup Email Verification
router.post('/request-signup-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if email already exists
    const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in database
    await pool.query('DELETE FROM otp_verifications WHERE email = ? AND type = "email"', [email]);
    await pool.query(
      'INSERT INTO otp_verifications (email, otp, expiresAt, verified, type) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE), FALSE, "email")',
      [email, otp]
    );

    // Send Email
    const emailResult = await sendVerificationOTP(email, otp);

    if (emailResult.success) {
      res.json({ message: 'Verification code sent to your email' });
    } else {
      res.status(500).json({ error: 'Failed to send verification email', details: emailResult.error });
    }
  } catch (error) {
    console.error('Signup OTP error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify Signup OTP
router.post('/verify-signup-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    // Check OTP
    const [otps] = await pool.query(
      'SELECT * FROM otp_verifications WHERE email = ? AND otp = ? AND type = "email" AND expiresAt > UTC_TIMESTAMP() AND verified = FALSE',
      [email, otp]
    );

    if (otps.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify signup OTP error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { username, otp } = req.body;

    if (!username || !otp) {
      return res.status(400).json({ error: 'Username and OTP are required' });
    }

    // Find user's phone
    const [users] = await pool.query('SELECT phone FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      console.log(`[OTP Verify] User not found: ${username}`);
      return res.status(404).json({ error: 'User not found' });
    }

    const phone = users[0].phone;
    console.log(`[OTP Verify] Attempting to verify OTP for user: ${username}, phone: ${phone}, otp: ${otp}`);

    // Check OTP
    const [otps] = await pool.query(
      'SELECT * FROM otp_verifications WHERE phone = ? AND otp = ? AND expiresAt > UTC_TIMESTAMP() AND verified = FALSE',
      [phone, otp]
    );

    if (otps.length === 0) {
      // Log more details for debugging
      const [allOtps] = await pool.query(
        'SELECT *, expiresAt > UTC_TIMESTAMP() as isNotExpired FROM otp_verifications WHERE phone = ? ORDER BY createdAt DESC LIMIT 1',
        [phone]
      );
      console.log(`[OTP Verify] No matching active OTP found. Last OTP record for this phone:`, allOtps[0] || 'NONE');
      
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    console.log(`[OTP Verify] Success! Found matching OTP:`, otps[0]);

    // Mark as verified
    await pool.query('UPDATE otp_verifications SET verified = TRUE WHERE id = ?', [otps[0].id]);

    res.json({ message: 'OTP verified successfully', verified: true });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { username, otp, newPassword } = req.body;

    if (!username || !otp || !newPassword) {
      return res.status(400).json({ error: 'Username, OTP, and new password are required' });
    }

    // Find user's phone
    const [users] = await pool.query('SELECT id, phone FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Check if OTP was verified
    const [otps] = await pool.query(
      'SELECT * FROM otp_verifications WHERE phone = ? AND otp = ? AND verified = TRUE',
      [user.phone, otp]
    );

    if (otps.length === 0) {
      return res.status(400).json({ error: 'OTP not verified or invalid' });
    }

    // Hash new password
    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    // Update password
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

    // Clean up OTP
    await pool.query('DELETE FROM otp_verifications WHERE phone = ?', [user.phone]);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

