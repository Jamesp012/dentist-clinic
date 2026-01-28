# Patient Claiming Feature - Quick Setup Guide

## 🚀 Quick Start

### 1. Database Migration
Run the migration to add new fields and tables:

```bash
cd backend
mysql -u root -p dental_clinic < migrate-patient-claiming.sql
```

Or manually in MySQL:
```sql
USE dental_clinic;

-- Add has_account column
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS has_account BOOLEAN DEFAULT FALSE;

-- Create OTP table
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

-- Update existing patients
UPDATE patients 
SET has_account = TRUE 
WHERE user_id IS NOT NULL;
```

### 2. Restart Backend Server
```bash
cd backend
npm start
```

### 3. Test the Flow

#### Test Scenario 1: Patient with Existing Record
1. Add a test patient WITHOUT user_id:
```sql
INSERT INTO patients (name, dateOfBirth, phone, email, sex, has_account)
VALUES ('Test Patient', '1990-01-15', '(555) 123-4567', 'test@example.com', 'Male', FALSE);
```

2. Go to signup page
3. Select "Patient" role
4. Click "Create Account"
5. Choose "Yes, I have a record"
6. Enter:
   - Name: Test Patient
   - DOB: 1990-01-15
   - Phone: (555) 123-4567
7. Check console for OTP code (in development)
8. Enter OTP
9. Create account credentials
10. Success! Patient can now see their old records

#### Test Scenario 2: New Patient
1. Go to signup page
2. Select "Patient" role
3. Fill registration form
4. Choose "No, I'm new"
5. Account created with new patient record

## 📋 Verification

### Check Database Changes
```sql
-- Verify has_account column exists
DESCRIBE patients;

-- Verify OTP table exists
DESCRIBE otp_verifications;

-- Check patients without accounts
SELECT id, name, phone, has_account 
FROM patients 
WHERE has_account = FALSE;

-- Check patients with accounts
SELECT p.id, p.name, p.has_account, u.username 
FROM patients p 
LEFT JOIN users u ON p.user_id = u.id 
WHERE p.has_account = TRUE;
```

### Check Backend Routes
```bash
# Test health check
curl http://localhost:5000/api/health

# Test search endpoint (should return no match for fake data)
curl -X POST http://localhost:5000/api/patient-claiming/search \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test","dateOfBirth":"2000-01-01","phone":"0000000000"}'
```

## 🔧 Configuration

### Development Mode (Console OTP)
By default, OTP codes are logged to the console for testing.

Check your backend terminal for messages like:
```
[SMS] Sending to (555) 123-4567: Your dental clinic verification code is: 123456
[DEV MODE] OTP: 123456
```

### Production Mode (Real SMS)
See [PATIENT_CLAIMING_IMPLEMENTATION.md](PATIENT_CLAIMING_IMPLEMENTATION.md#sms-integration-todo) for SMS integration with Twilio or other providers.

## 🐛 Troubleshooting

### Backend not starting
```bash
cd backend
npm install
node server.js
```

### Frontend not showing claiming flow
1. Check browser console for errors
2. Verify `PatientRecordClaiming.tsx` is in `src/components/`
3. Check that `showClaimingFlow` state is working in `AuthPage.tsx`
4. Clear browser cache and reload

### OTP not working
1. Check backend console for OTP code
2. Verify OTP hasn't expired (10 minutes)
3. Check `otp_verifications` table:
```sql
SELECT * FROM otp_verifications ORDER BY createdAt DESC LIMIT 5;
```

### Patient records not showing after linking
1. Verify user_id is set:
```sql
SELECT id, name, user_id, has_account FROM patients WHERE id = ?;
```

2. Check JWT token includes patientId
3. Verify patient portal queries use patientId correctly

## 📚 Key Features

✅ **Secure OTP Verification** - SMS code to registered phone number  
✅ **Smart Matching** - Handles no match, single match, multiple matches  
✅ **Account Protection** - Prevents duplicate account linking  
✅ **Smooth UX** - Multi-step flow with animations and feedback  
✅ **Transaction Safety** - Database transactions ensure data integrity  
✅ **Flexible Flow** - Works for existing patients and new patients  

## 📁 New Files

- `backend/routes/patient-claiming.js` - API endpoints
- `backend/migrate-patient-claiming.sql` - Database migration
- `src/components/PatientRecordClaiming.tsx` - Frontend component
- `PATIENT_CLAIMING_IMPLEMENTATION.md` - Complete documentation

## 🔍 Next Steps

1. ✅ Run database migration
2. ✅ Test with sample patient data
3. ✅ Verify claiming flow works end-to-end
4. 🔲 Integrate real SMS provider for production
5. 🔲 Add monitoring and logging
6. 🔲 Train staff on new patient registration process

---

**Need Help?** Check the full documentation in `PATIENT_CLAIMING_IMPLEMENTATION.md`
