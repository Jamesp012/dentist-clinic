const pool = require('./config/database');

async function fixSchema() {
  try {
    console.log('Starting schema fix for referrals...');

    // 1. Ensure referrals table has all required columns
    const [referralCols] = await pool.query('DESCRIBE referrals');
    const refColNames = referralCols.map(c => c.Field);

    if (!refColNames.includes('referralType')) {
      await pool.query("ALTER TABLE referrals ADD COLUMN referralType ENUM('incoming', 'outgoing') DEFAULT 'outgoing' AFTER createdByRole");
      console.log('✓ Added referralType to referrals');
    }

    if (!refColNames.includes('source')) {
      await pool.query("ALTER TABLE referrals ADD COLUMN source ENUM('patient-uploaded', 'staff-upload', 'external') DEFAULT 'staff-upload' AFTER referralType");
      console.log('✓ Added source to referrals');
    }

    if (!refColNames.includes('xrayDiagramSelections')) {
      await pool.query("ALTER TABLE referrals ADD COLUMN xrayDiagramSelections JSON DEFAULT NULL AFTER source");
      console.log('✓ Added xrayDiagramSelections to referrals');
    }

    if (!refColNames.includes('xrayNotes')) {
      await pool.query("ALTER TABLE referrals ADD COLUMN xrayNotes TEXT CHARACTER SET utf8mb4 DEFAULT NULL AFTER xrayDiagramSelections");
      console.log('✓ Added xrayNotes to referrals');
    }

    // 2. Ensure referral_files table exists
    await pool.query(`CREATE TABLE IF NOT EXISTS referral_files (
      id INT PRIMARY KEY AUTO_INCREMENT,
      referralId INT,
      patientId INT,
      fileName VARCHAR(255) NOT NULL,
      fileType ENUM('image', 'pdf', 'document') NOT NULL,
      filePath VARCHAR(500) NOT NULL,
      fileSize INT,
      uploadedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      uploadedBy INT,
      FOREIGN KEY (referralId) REFERENCES referrals(id) ON DELETE CASCADE,
      FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
      INDEX idx_patient_date (patientId, uploadedDate)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('✓ referral_files table ensured');

    // 3. Ensure referral_files has 'url' column
    const [fileCols] = await pool.query('DESCRIBE referral_files');
    const fileColNames = fileCols.map(c => c.Field);

    if (!fileColNames.includes('url')) {
      await pool.query("ALTER TABLE referral_files ADD COLUMN url VARCHAR(500) DEFAULT NULL AFTER filePath");
      console.log('✓ Added url to referral_files');
    }

    console.log('✓ Schema fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Schema fix failed:', error);
    process.exit(1);
  }
}

fixSchema();
