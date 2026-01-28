# Patient Record Claiming - Quick Reference Card

## 🔍 Quick Debug Commands

### Check Patient Records
```sql
-- View all patients without accounts
SELECT id, name, phone, dateOfBirth, has_account 
FROM patients 
WHERE has_account = FALSE;

-- View all patients with accounts
SELECT p.id, p.name, p.phone, p.has_account, u.username, u.id as user_id
FROM patients p 
LEFT JOIN users u ON p.user_id = u.id 
WHERE p.has_account = TRUE;

-- Check specific patient
SELECT * FROM patients WHERE name LIKE '%John%';
```

### Check OTP Records
```sql
-- View recent OTPs
SELECT id, phone, otp, expiresAt, verified, patientId, createdAt 
FROM otp_verifications 
ORDER BY createdAt DESC 
LIMIT 10;

-- Check active OTPs
SELECT * FROM otp_verifications 
WHERE verified = FALSE AND expiresAt > NOW();

-- Check expired OTPs
SELECT * FROM otp_verifications 
WHERE expiresAt < NOW();
```

### API Testing
```bash
# Health check
curl http://localhost:5000/api/health

# Search for patient
curl -X POST http://localhost:5000/api/patient-claiming/search \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test Patient","dateOfBirth":"1990-01-15","phone":"(555) 123-4567"}'

# Send OTP
curl -X POST http://localhost:5000/api/patient-claiming/send-otp \
  -H "Content-Type: application/json" \
  -d '{"patientId":1}'
```

## 🐛 Common Issues & Solutions

### Issue: "No record found" but patient exists
**Cause**: Patient already has account (has_account = TRUE)
**Solution**: 
```sql
-- Check if patient has account
SELECT id, name, has_account, user_id FROM patients WHERE name = 'Patient Name';

-- If incorrectly marked, reset (CAUTION: only in dev/test)
UPDATE patients SET has_account = FALSE, user_id = NULL WHERE id = 1;
```

### Issue: OTP not showing in console
**Cause**: Console logging might be filtered
**Solution**: 
```javascript
// In routes/patient-claiming.js, look for:
console.log(`[SMS] Sending to ${phone}: ${message}`);
console.log(`[DEV MODE] OTP: ${message.match(/\d{6}/)?.[0]}`);

// Check backend terminal output
```

### Issue: "OTP expired"
**Cause**: OTP older than 10 minutes
**Solution**:
```sql
-- Check OTP expiration
SELECT otp, expiresAt, NOW(), 
       TIMESTAMPDIFF(MINUTE, NOW(), expiresAt) as minutes_remaining
FROM otp_verifications 
WHERE patientId = 1 
ORDER BY createdAt DESC LIMIT 1;

-- If needed, extend expiration (dev only)
UPDATE otp_verifications 
SET expiresAt = DATE_ADD(NOW(), INTERVAL 10 MINUTE) 
WHERE id = 123;
```

### Issue: "Username already exists"
**Cause**: Username taken by another user
**Solution**: User needs to choose different username
```sql
-- Check if username exists
SELECT id, username, role FROM users WHERE username = 'testuser';
```

### Issue: Frontend not showing claiming flow
**Cause**: Component not rendering or import issue
**Solution**:
1. Check browser console for errors
2. Verify import: `import { PatientRecordClaiming } from './PatientRecordClaiming'`
3. Check showClaimingFlow state in AuthPage
4. Verify role is 'patient'

### Issue: Multiple matches always returned
**Cause**: Duplicate patient records or search too broad
**Solution**:
```sql
-- Find duplicate patients
SELECT name, dateOfBirth, phone, COUNT(*) as count
FROM patients
GROUP BY name, dateOfBirth, phone
HAVING count > 1;

-- Clean up duplicates (carefully!)
-- Review and merge duplicate records manually
```

## 📞 API Endpoints Quick Reference

| Endpoint | Method | Purpose | Body |
|----------|--------|---------|------|
| `/api/patient-claiming/search` | POST | Search records | `{fullName, dateOfBirth, phone}` |
| `/api/patient-claiming/select` | POST | Select from multiple | `{patientId, lastVisit?}` |
| `/api/patient-claiming/send-otp` | POST | Send OTP | `{patientId}` |
| `/api/patient-claiming/resend-otp` | POST | Resend OTP | `{patientId}` |
| `/api/patient-claiming/verify-and-link` | POST | Verify & link | `{patientId, otp, userData}` |

## 🔐 Security Checks

### Verify OTP Security
```sql
-- Check OTP expiration times
SELECT otp, 
       createdAt, 
       expiresAt, 
       TIMESTAMPDIFF(MINUTE, createdAt, expiresAt) as validity_minutes
FROM otp_verifications
ORDER BY createdAt DESC LIMIT 5;

-- Check for reused OTPs
SELECT otp, COUNT(*) as usage_count
FROM otp_verifications
WHERE verified = TRUE
GROUP BY otp
HAVING usage_count > 1;
```

### Verify Account Protection
```sql
-- Check for duplicate linkings
SELECT user_id, COUNT(*) as patient_count
FROM patients
WHERE user_id IS NOT NULL
GROUP BY user_id
HAVING patient_count > 1;

-- Verify has_account consistency
SELECT 
  SUM(CASE WHEN user_id IS NOT NULL AND has_account = FALSE THEN 1 ELSE 0 END) as inconsistent_records,
  SUM(CASE WHEN user_id IS NULL AND has_account = TRUE THEN 1 ELSE 0 END) as orphaned_flags
FROM patients;
```

## 🧪 Test Data Setup

### Create Test Patient (Without Account)
```sql
INSERT INTO patients (name, dateOfBirth, phone, email, sex, has_account, lastVisit)
VALUES 
('Test Patient One', '1990-01-15', '(555) 111-1111', 'test1@example.com', 'Male', FALSE, '2025-01-10'),
('Test Patient Two', '1985-05-20', '(555) 222-2222', 'test2@example.com', 'Female', FALSE, '2024-12-15'),
('Multiple Match A', '1992-03-10', '(555) 333-3333', 'multi1@example.com', 'Male', FALSE, '2025-01-05'),
('Multiple Match B', '1992-03-10', '(555) 333-3333', 'multi2@example.com', 'Male', FALSE, '2024-11-20');
```

### Clean Up Test Data
```sql
-- Remove test patients (CAUTION: only in dev/test)
DELETE FROM patients WHERE name LIKE 'Test Patient%';
DELETE FROM patients WHERE name LIKE 'Multiple Match%';
DELETE FROM otp_verifications WHERE phone LIKE '(555) %';
```

## 📊 Monitoring Queries

### Daily Statistics
```sql
-- Claiming attempts today
SELECT COUNT(*) as total_attempts
FROM otp_verifications
WHERE DATE(createdAt) = CURDATE();

-- Successful claims today
SELECT COUNT(*) as successful_claims
FROM patients
WHERE has_account = TRUE 
  AND DATE(createdAt) = CURDATE();

-- Success rate
SELECT 
  (SELECT COUNT(*) FROM patients WHERE has_account = TRUE) as total_claimed,
  (SELECT COUNT(*) FROM patients WHERE has_account = FALSE) as unclaimed,
  ROUND((SELECT COUNT(*) FROM patients WHERE has_account = TRUE) * 100.0 / COUNT(*), 2) as claim_rate_percent
FROM patients;
```

### Performance Queries
```sql
-- Slow queries (if query logging enabled)
SELECT * FROM mysql.slow_log 
WHERE start_time > DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY query_time DESC;

-- Table sizes
SELECT 
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb
FROM information_schema.TABLES
WHERE table_schema = 'dental_clinic'
  AND table_name IN ('patients', 'otp_verifications', 'users');
```

## 🎯 Key File Locations

```
Backend:
├── routes/patient-claiming.js    - Main claiming logic
├── routes/auth.js                - User registration
├── server.js                     - Route registration
└── migrate-patient-claiming.sql  - Database migration

Frontend:
├── components/PatientRecordClaiming.tsx  - Claiming UI
├── components/AuthPage.tsx              - Auth integration
├── api.js                              - API calls
└── api.d.ts                            - Type definitions

Docs:
├── PATIENT_CLAIMING_IMPLEMENTATION.md   - Full documentation
├── PATIENT_CLAIMING_QUICK_START.md     - Setup guide
├── PATIENT_CLAIMING_FLOW_DIAGRAM.md    - Visual flows
├── PATIENT_CLAIMING_SUMMARY.md         - Overview
├── PATIENT_CLAIMING_CHECKLIST.md       - Task tracking
└── PATIENT_CLAIMING_DEBUG.md           - This file
```

## 🚨 Emergency Procedures

### Rollback Database Changes
```sql
-- Backup first!
mysqldump -u root -p dental_clinic > backup_emergency.sql

-- Remove has_account column
ALTER TABLE patients DROP COLUMN has_account;

-- Drop OTP table
DROP TABLE otp_verifications;

-- Restore from backup if needed
mysql -u root -p dental_clinic < backup_before_migration.sql
```

### Disable Claiming Flow (Quick Fix)
```typescript
// In AuthPage.tsx, temporarily bypass claiming:
if (signupData.role === 'patient') {
  // setShowClaimingFlow(true);  // Comment this out
  // Fall through to normal registration
}
```

### Reset Patient Account Link
```sql
-- CAUTION: Only in development/testing
-- Unlink account from patient record
UPDATE patients 
SET user_id = NULL, has_account = FALSE 
WHERE id = 123;

-- Delete user account if needed
DELETE FROM users WHERE id = 456;
```

## 📞 Support Contacts

**Technical Issues**: Check backend console logs  
**Database Issues**: Review MySQL error log  
**Frontend Issues**: Check browser console  
**Documentation**: See PATIENT_CLAIMING_IMPLEMENTATION.md  

---

**Quick Tip**: Most issues can be debugged by:
1. Checking backend console for OTP codes
2. Verifying has_account flag in database
3. Checking OTP expiration times
4. Reviewing browser console errors
