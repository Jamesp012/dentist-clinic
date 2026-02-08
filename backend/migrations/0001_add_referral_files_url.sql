-- Migration: add nullable url column to referral_files and populate from filePath
-- Run this on your MySQL database (adjust schema/database name if needed)

ALTER TABLE referral_files
  ADD COLUMN url VARCHAR(1024) NULL;

-- Populate url from filePath where filePath exists and filename can be extracted
UPDATE referral_files
SET url = CONCAT('/uploads/referrals/', REPLACE(SUBSTRING_INDEX(filePath, '/', -1), '\\', ''))
WHERE filePath IS NOT NULL AND (url IS NULL OR url = '');

-- Note: If your file paths use backslashes on Windows, the REPLACE will strip them.
-- After running, restart the backend server so new column is recognized by queries.
