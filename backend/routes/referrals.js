const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../uploads/referrals');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Get all referrals
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [referrals] = await pool.query('SELECT * FROM referrals ORDER BY createdAt DESC');

    // Attach uploaded files for each referral
    const referralIds = referrals.map(r => r.id);
    let filesByReferral = {};
    if (referralIds.length > 0) {
      const [files] = await pool.query('SELECT id, referralId, fileName, fileType, filePath, uploadedDate FROM referral_files WHERE referralId IN (?)', [referralIds]);

      // Normalize files and generate public URL from stored filePath
      const normalizedFiles = files.map(f => ({
        id: f.id,
        referralId: f.referralId,
        fileName: f.fileName,
        fileType: f.fileType,
        uploadedDate: f.uploadedDate,
        url: f.url || `/uploads/referrals/${path.basename(f.filePath || '')}`
      }));

      filesByReferral = normalizedFiles.reduce((acc, f) => {
        acc[f.referralId] = acc[f.referralId] || [];
        acc[f.referralId].push(f);
        return acc;
      }, {});
    }

    const parsedReferrals = referrals.map(ref => ({
      ...ref,
      selectedServices: ref.selectedServices ? JSON.parse(ref.selectedServices) : {},
      xrayDiagramSelections: ref.xrayDiagramSelections ? JSON.parse(ref.xrayDiagramSelections) : {},
      uploadedFiles: filesByReferral[ref.id] || []
    }));
    res.json(parsedReferrals);
  } catch (error) {
    console.error('Error fetching referrals:', error);
    // Workaround: if the database is missing optional 'url' column in file rows,
    // return an empty list to avoid spamming the frontend with repeated 500s.
    if (error && error.message && error.message.includes("Unknown column 'url'")) {
      return res.json([]);
    }
    res.status(500).json({ error: error.message });
  }
});

// Get referrals by patient ID
router.get('/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    const [referrals] = await pool.query(
      'SELECT * FROM referrals WHERE patientId = ? ORDER BY createdAt DESC',
      [req.params.patientId]
    );

    const referralIds = referrals.map(r => r.id);
    let filesByReferral = {};
    if (referralIds.length > 0) {
      const [files] = await pool.query('SELECT id, referralId, fileName, fileType, filePath, uploadedDate FROM referral_files WHERE referralId IN (?)', [referralIds]);

      const normalizedFiles = files.map(f => ({
        id: f.id,
        referralId: f.referralId,
        fileName: f.fileName,
        fileType: f.fileType,
        uploadedDate: f.uploadedDate,
        url: f.url || `/uploads/referrals/${path.basename(f.filePath || '')}`
      }));

      filesByReferral = normalizedFiles.reduce((acc, f) => {
        acc[f.referralId] = acc[f.referralId] || [];
        acc[f.referralId].push(f);
        return acc;
      }, {});
    }

    const parsedReferrals = referrals.map(ref => ({
      ...ref,
      selectedServices: ref.selectedServices ? JSON.parse(ref.selectedServices) : {},
      xrayDiagramSelections: ref.xrayDiagramSelections ? JSON.parse(ref.xrayDiagramSelections) : {},
      uploadedFiles: filesByReferral[ref.id] || []
    }));
    res.json(parsedReferrals);
  } catch (error) {
    console.error('Error fetching referrals by patient:', error);
    if (error && error.message && error.message.includes("Unknown column 'url'")) {
      return res.json([]);
    }
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
    const referral = referrals[0];

    const [files] = await pool.query('SELECT id, fileName, fileType, filePath, uploadedDate FROM referral_files WHERE referralId = ?', [referral.id]);

    const normalizedFiles = files.map(f => ({
      id: f.id,
      fileName: f.fileName,
      fileType: f.fileType,
      uploadedDate: f.uploadedDate,
      url: f.url || `/uploads/referrals/${path.basename(f.filePath || '')}`
    }));

    res.json({
      ...referral,
      selectedServices: referral.selectedServices ? JSON.parse(referral.selectedServices) : {},
      xrayDiagramSelections: referral.xrayDiagramSelections ? JSON.parse(referral.xrayDiagramSelections) : {},
      uploadedFiles: normalizedFiles || []
    });
  } catch (error) {
    console.error('Error fetching referral by id:', error);
    if (error && error.message && error.message.includes("Unknown column 'url'")) {
      return res.status(500).json({ error: 'Referral file url column missing; please check DB schema' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Create referral
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { patientId, patientName, referringDentist, referredByContact, referredByEmail, referredTo, specialty, reason, selectedServices, date, urgency, createdByRole, referralType, xrayDiagramSelections, xrayNotes, uploadedFileIds, source } = req.body;

    // Treat patient-created referrals as incoming
    const roleValue = createdByRole === 'patient' ? 'patient' : 'staff';
    const servicesJson = selectedServices ? JSON.stringify(selectedServices) : null;
    const xrayDiagJson = xrayDiagramSelections ? JSON.stringify(xrayDiagramSelections) : null;
    const refType = roleValue === 'patient' ? 'incoming' : (referralType || 'outgoing');

    // Source default: if provided use it, otherwise patient uploads set source accordingly
    let sourceValue = source || (roleValue === 'patient' ? 'patient-uploaded' : 'staff-upload');

    const [result] = await pool.query(
      'INSERT INTO referrals (patientId, patientName, referringDentist, referredByContact, referredByEmail, referredTo, specialty, reason, selectedServices, date, urgency, createdByRole, referralType, source, xrayDiagramSelections, xrayNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [patientId || null, patientName, referringDentist, referredByContact || null, referredByEmail || null, referredTo, specialty || null, reason || null, servicesJson, date, urgency || 'routine', roleValue, refType, sourceValue, xrayDiagJson, xrayNotes || null]
    );

    // If uploaded files were provided, attach them to this referral
    if (Array.isArray(uploadedFileIds) && uploadedFileIds.length > 0) {
      await pool.query('UPDATE referral_files SET referralId = ? WHERE id IN (?)', [result.insertId, uploadedFileIds]);
    }

    // Load attached files to include in the response
    const [files] = await pool.query('SELECT id, fileName, fileType, filePath, uploadedDate FROM referral_files WHERE referralId = ?', [result.insertId]);

    const normalizedFiles = files.map(f => ({
      id: f.id,
      fileName: f.fileName,
      fileType: f.fileType,
      uploadedDate: f.uploadedDate,
      url: f.url || `/uploads/referrals/${path.basename(f.filePath || '')}`
    }));

    res.status(201).json({ 
      id: result.insertId, 
      patientId: patientId || null,
      patientName,
      referringDentist,
      referredByContact: referredByContact || null,
      referredByEmail: referredByEmail || null,
      referredTo,
      specialty: specialty || null,
      reason: reason || null,
      selectedServices: selectedServices || {},
      date,
      urgency: urgency || 'routine',
      createdByRole: roleValue,
      referralType: refType,
      source: sourceValue,
      xrayDiagramSelections: xrayDiagramSelections || {},
      xrayNotes: xrayNotes || null,
      uploadedFiles: normalizedFiles || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload referral file
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { patientId, referralId } = req.body;
    const fileName = req.file.originalname;
    const filePath = req.file.path;
    const fileSize = req.file.size;
    const userId = req.user?.id || null;
    const mime = req.file.mimetype || '';
    const fileType = mime.startsWith('image/') ? 'image' : mime === 'application/pdf' ? 'pdf' : 'document';

    // Compute public URL for the uploaded file
    const publicUrl = `/uploads/referrals/${req.file.filename}`;

    // Store file information in database (include `url` column)
    const [result] = await pool.query(
      'INSERT INTO referral_files (referralId, patientId, fileName, fileType, filePath, fileSize, uploadedBy, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [referralId || null, patientId || null, fileName, fileType, filePath, fileSize, userId, publicUrl]
    );

    // If referralId provided, ensure it's attached; otherwise client may attach later
    if (referralId) {
      await pool.query('UPDATE referral_files SET referralId = ? WHERE id = ?', [referralId, result.insertId]);
    }

    res.status(201).json({
      id: result.insertId,
      patientId,
      fileName,
      fileType,
      uploadedDate: new Date().toISOString(),
      url: publicUrl
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete referral file
router.delete('/file/:fileId', authMiddleware, async (req, res) => {
  try {
    const [files] = await pool.query('SELECT filePath FROM referral_files WHERE id = ?', [req.params.fileId]);
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete file from filesystem
    const filePath = files[0].filePath;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await pool.query('DELETE FROM referral_files WHERE id = ?', [req.params.fileId]);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update referral
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { patientId, patientName, referringDentist, referredByContact, referredByEmail, referredTo, specialty, reason, selectedServices, date, urgency, createdByRole, referralType, xrayDiagramSelections, xrayNotes } = req.body;
    const roleValue = createdByRole === 'patient' ? 'patient' : 'staff';
    const servicesJson = selectedServices ? JSON.stringify(selectedServices) : null;
    const xrayDiagJson = xrayDiagramSelections ? JSON.stringify(xrayDiagramSelections) : null;
    const refType = referralType || 'outgoing';
    
    await pool.query(
      'UPDATE referrals SET patientId=?, patientName=?, referringDentist=?, referredByContact=?, referredByEmail=?, referredTo=?, specialty=?, reason=?, selectedServices=?, date=?, urgency=?, createdByRole=?, referralType=?, xrayDiagramSelections=?, xrayNotes=? WHERE id=?',
      [patientId || null, patientName, referringDentist, referredByContact || null, referredByEmail || null, referredTo, specialty || null, reason || null, servicesJson, date, urgency || 'routine', roleValue, refType, xrayDiagJson, xrayNotes || null, req.params.id]
    );
    res.json({ 
      id: req.params.id, 
      ...req.body, 
      createdByRole: roleValue,
      referralType: refType,
      selectedServices: selectedServices || {},
      xrayDiagramSelections: xrayDiagramSelections || {}
    });
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
