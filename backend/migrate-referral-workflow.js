const pool = require('./config/database');

async function migrate() {
  try {
    console.log('Starting migration for referral workflow...');

    // Add referralType column to referrals table
    try {
      await pool.query(`
        ALTER TABLE referrals 
        ADD COLUMN referralType ENUM('incoming', 'outgoing') DEFAULT 'outgoing' AFTER createdByRole
      `);
      console.log('✓ Added referralType column to referrals table');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('✓ referralType column already exists');
      } else {
        throw error;
      }
    }

    // Add xrayDiagramSelections and xrayNotes columns if they don't exist
    try {
      await pool.query(`
        ALTER TABLE referrals 
        ADD COLUMN xrayDiagramSelections JSON DEFAULT NULL AFTER referralType,
        ADD COLUMN xrayNotes TEXT CHARACTER SET utf8mb4 DEFAULT NULL AFTER xrayDiagramSelections
      `);
      console.log('✓ Added xray columns to referrals table');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('✓ Xray columns already exist');
      } else {
        throw error;
      }
    }

    // Add patient type and existing record fields
    try {
      await pool.query(`
        ALTER TABLE patients 
        ADD COLUMN patientType ENUM('direct', 'referred') DEFAULT 'direct' AFTER totalBalance,
        ADD COLUMN hasExistingRecord BOOLEAN DEFAULT FALSE AFTER patientType
      `);
      console.log('✓ Added patientType and hasExistingRecord columns to patients table');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('✓ Patient type columns already exist');
      } else {
        throw error;
      }
    }

    // Create referral_files table for tracking uploaded referral files
    try {
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
        FOREIGN KEY (uploadedBy) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_patient_date (patientId, uploadedDate)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log('✓ Created referral_files table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✓ referral_files table already exists');
      } else {
        throw error;
      }
    }

    console.log('✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
