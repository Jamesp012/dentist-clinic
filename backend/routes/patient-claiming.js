const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const router = express.Router();

/**
 * PATIENT RECORD CLAIMING ROUTES
 * 
 * Flow:
 * 1. Patient signs up and indicates they have existing record
 * 2. Patient provides identifying information (name, DOB, phone)
 * 3. System searches for matching patient records
 * 4. If match found, send OTP to phone number on record
 * 5. Patient verifies OTP
 * 6. System links user account to patient record
 */

// Helper function to generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to send SMS (placeholder - integrate with SMS provider)
async function sendSMS(phone, message) {
  // TODO: Integrate with actual SMS provider (Twilio, etc.)
  console.log(`[SMS] Sending to ${phone}: ${message}`);
  
  // For development/testing, log the OTP
  console.log(`[DEV MODE] OTP: ${message.match(/\d{6}/)?.[0]}`);
  
  // Simulate SMS sending
  return { success: true, message: 'SMS sent (simulated)' };
}

/**
 * Step 1: Search for existing patient records
 * POST /api/patient-claiming/search
 * 
 * Body: { fullName, dateOfBirth, phone }
 * 
 * Returns:
 * - { found: false } if no match
 * - { found: true, matches: 1, patientId } if single match
 * - { found: true, matches: N, needsMoreInfo: true } if multiple matches
 */
router.post('/search', async (req, res) => {
  try {
    const { fullName, dateOfBirth, phone } = req.body;

    if (!fullName || !dateOfBirth || !phone) {
      return res.status(400).json({ 
        error: 'Full name, date of birth, and phone number are required' 
      });
    }

    // Search for matching patients (exclude those with accounts already)
    const [patients] = await pool.query(
      `SELECT id, name, dateOfBirth, phone, email, lastVisit, has_account 
       FROM patients 
       WHERE name LIKE ? 
         AND dateOfBirth = ? 
         AND phone LIKE ?
         AND has_account = FALSE`,
      [`%${fullName}%`, dateOfBirth, `%${phone}%`]
    );

    if (patients.length === 0) {
      return res.json({ 
        found: false, 
        message: 'No existing record found. You can proceed with new registration.' 
      });
    }

    if (patients.length === 1) {
      // Single match - proceed to OTP verification
      return res.json({
        found: true,
        matches: 1,
        patientId: patients[0].id,
        patientInfo: {
          name: patients[0].name,
          phone: patients[0].phone,
          lastVisit: patients[0].lastVisit
        }
      });
    }

    // Multiple matches - need more info
    return res.json({
      found: true,
      matches: patients.length,
      needsMoreInfo: true,
      message: 'Multiple records found. Please provide additional information.',
      patients: patients.map(p => ({
        id: p.id,
        name: p.name,
        lastVisit: p.lastVisit
      }))
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search patient records' });
  }
});

/**
 * Step 2: Select specific patient from multiple matches
 * POST /api/patient-claiming/select
 * 
 * Body: { patientId, lastVisit (optional for verification) }
 */
router.post('/select', async (req, res) => {
  try {
    const { patientId, lastVisit } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    // Verify patient exists and doesn't have account
    const [patients] = await pool.query(
      'SELECT id, name, phone, lastVisit, has_account FROM patients WHERE id = ?',
      [patientId]
    );

    if (patients.length === 0) {
      return res.status(404).json({ error: 'Patient record not found' });
    }

    const patient = patients[0];

    if (patient.has_account) {
      return res.status(400).json({ 
        error: 'This patient record is already linked to an account' 
      });
    }

    // Optional: Verify lastVisit if provided
    if (lastVisit && patient.lastVisit) {
      const providedDate = new Date(lastVisit);
      const recordDate = new Date(patient.lastVisit);
      
      if (providedDate.getTime() !== recordDate.getTime()) {
        return res.status(400).json({ 
          error: 'Last visit date does not match our records' 
        });
      }
    }

    res.json({
      success: true,
      patientId: patient.id,
      patientInfo: {
        name: patient.name,
        phone: patient.phone,
        lastVisit: patient.lastVisit
      }
    });

  } catch (error) {
    console.error('Select error:', error);
    res.status(500).json({ error: 'Failed to select patient record' });
  }
});

/**
 * Step 3: Send OTP for verification
 * POST /api/patient-claiming/send-otp
 * 
 * Body: { patientId }
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    // Get patient phone number
    const [patients] = await pool.query(
      'SELECT id, phone, has_account FROM patients WHERE id = ?',
      [patientId]
    );

    if (patients.length === 0) {
      return res.status(404).json({ error: 'Patient record not found' });
    }

    const patient = patients[0];

    if (patient.has_account) {
      return res.status(400).json({ 
        error: 'This patient record is already linked to an account' 
      });
    }

    if (!patient.phone) {
      return res.status(400).json({ 
        error: 'No phone number on record. Please contact clinic staff.' 
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete old OTPs for this patient
    await pool.query(
      'DELETE FROM otp_verifications WHERE patientId = ?',
      [patientId]
    );

    // Store OTP in database
    await pool.query(
      'INSERT INTO otp_verifications (phone, otp, expiresAt, patientId) VALUES (?, ?, ?, ?)',
      [patient.phone, otp, expiresAt, patientId]
    );

    // Send SMS
    const smsResult = await sendSMS(
      patient.phone,
      `Your dental clinic verification code is: ${otp}. Valid for 10 minutes.`
    );

    if (smsResult.success) {
      res.json({ 
        success: true, 
        message: 'OTP sent successfully',
        phone: patient.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') // Mask phone
      });
    } else {
      res.status(500).json({ error: 'Failed to send OTP' });
    }

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

/**
 * Step 4: Verify OTP and link account
 * POST /api/patient-claiming/verify-and-link
 * 
 * Body: { patientId, otp, userData: { username, password, email, etc. } }
 * 
 * This endpoint:
 * 1. Verifies the OTP
 * 2. Creates a new user account
 * 3. Links the user_id to the patient record
 * 4. Updates has_account = true
 * 5. Returns login token
 */
router.post('/verify-and-link', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { patientId, otp, userData } = req.body;

    if (!patientId || !otp || !userData) {
      return res.status(400).json({ 
        error: 'Patient ID, OTP, and user data are required' 
      });
    }

    const { username, password, email } = userData;

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    await connection.beginTransaction();

    // 1. Verify OTP
    const [otpRecords] = await connection.query(
      `SELECT id, verified, expiresAt 
       FROM otp_verifications 
       WHERE patientId = ? AND otp = ? 
       ORDER BY createdAt DESC 
       LIMIT 1`,
      [patientId, otp]
    );

    if (otpRecords.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    const otpRecord = otpRecords[0];

    if (new Date() > new Date(otpRecord.expiresAt)) {
      await connection.rollback();
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (otpRecord.verified) {
      await connection.rollback();
      return res.status(400).json({ error: 'OTP has already been used' });
    }

    // 2. Check if username already exists
    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Username already exists' });
    }

    // 3. Get patient info
    const [patients] = await connection.query(
      'SELECT id, name, phone, email, has_account FROM patients WHERE id = ?',
      [patientId]
    );

    if (patients.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Patient record not found' });
    }

    const patient = patients[0];

    if (patient.has_account) {
      await connection.rollback();
      return res.status(400).json({ 
        error: 'This patient record is already linked to an account' 
      });
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Create user account
    const [userResult] = await connection.query(
      `INSERT INTO users (username, password, fullName, email, phone, role, isFirstLogin) 
       VALUES (?, ?, ?, ?, ?, 'patient', FALSE)`,
      [
        username, 
        hashedPassword, 
        patient.name, 
        email || patient.email, 
        patient.phone
      ]
    );

    const userId = userResult.insertId;

    // 6. Link user to patient record
    await connection.query(
      'UPDATE patients SET user_id = ?, has_account = TRUE, email = ? WHERE id = ?',
      [userId, email || patient.email, patientId]
    );

    // 7. Mark OTP as verified
    await connection.query(
      'UPDATE otp_verifications SET verified = TRUE WHERE id = ?',
      [otpRecord.id]
    );

    await connection.commit();

    // 8. Generate JWT token
    const token = jwt.sign(
      { 
        id: userId, 
        username: username, 
        role: 'patient', 
        fullName: patient.name,
        email: email || patient.email,
        patientId: patientId
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Account linked successfully',
      token,
      user: {
        id: userId,
        username: username,
        role: 'patient',
        fullName: patient.name,
        email: email || patient.email,
        patientId: patientId,
        isFirstLogin: false
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Verify and link error:', error);
    res.status(500).json({ error: 'Failed to verify and link account' });
  } finally {
    connection.release();
  }
});

/**
 * Resend OTP
 * POST /api/patient-claiming/resend-otp
 * 
 * Body: { patientId }
 */
router.post('/resend-otp', async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    // Check if patient exists
    const [patients] = await pool.query(
      'SELECT id, phone, has_account FROM patients WHERE id = ?',
      [patientId]
    );

    if (patients.length === 0) {
      return res.status(404).json({ error: 'Patient record not found' });
    }

    const patient = patients[0];

    if (patient.has_account) {
      return res.status(400).json({ 
        error: 'This patient record is already linked to an account' 
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete old OTPs
    await pool.query(
      'DELETE FROM otp_verifications WHERE patientId = ?',
      [patientId]
    );

    // Store new OTP
    await pool.query(
      'INSERT INTO otp_verifications (phone, otp, expiresAt, patientId) VALUES (?, ?, ?, ?)',
      [patient.phone, otp, expiresAt, patientId]
    );

    // Send SMS
    const smsResult = await sendSMS(
      patient.phone,
      `Your dental clinic verification code is: ${otp}. Valid for 10 minutes.`
    );

    if (smsResult.success) {
      res.json({ 
        success: true, 
        message: 'New OTP sent successfully' 
      });
    } else {
      res.status(500).json({ error: 'Failed to send OTP' });
    }

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
});

module.exports = router;
