-- Migration script for patient record claiming feature
-- Run this on existing databases to add new fields and tables

USE dental_clinic;

-- Add has_account column to patients table if it doesn't exist
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS has_account BOOLEAN DEFAULT FALSE;

-- Create OTP verification table
CREATE TABLE IF NOT EXISTS otp_verifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(20) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  patientId INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
  INDEX idx_phone_otp (phone, otp),
  INDEX idx_expires (expiresAt)
);

-- Update existing patients with user_id to have has_account = true
UPDATE patients 
SET has_account = TRUE 
WHERE user_id IS NOT NULL;

-- Display migration results
SELECT 'Migration completed successfully!' as Status;
SELECT COUNT(*) as 'Patients with accounts', 
       (SELECT COUNT(*) FROM patients WHERE has_account = FALSE) as 'Patients without accounts'
FROM patients 
WHERE has_account = TRUE;
