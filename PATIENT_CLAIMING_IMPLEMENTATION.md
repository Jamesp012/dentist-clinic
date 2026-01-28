# Patient Record Claiming and Verification System

## Overview

This implementation adds a secure patient record claiming and verification flow that allows patients with existing manual records (2025–present) to link their records to new user accounts through SMS OTP verification.

## Architecture

### Database Changes

#### 1. Patients Table
- **New Field**: `has_account` (BOOLEAN, DEFAULT FALSE)
  - Indicates whether a patient record is linked to a user account
  - Prevents duplicate account linking
  - Allows manual records to exist without accounts

#### 2. New Table: `otp_verifications`
```sql
CREATE TABLE otp_verifications (
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
```

### Backend API Endpoints

All endpoints are prefixed with `/api/patient-claiming/`

#### 1. **POST /search**
Search for existing patient records by identifying information.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "dateOfBirth": "1990-01-15",
  "phone": "(555) 123-4567"
}
```

**Response Scenarios:**

a) **No match found:**
```json
{
  "found": false,
  "message": "No existing record found. You can proceed with new registration."
}
```

b) **Single match found:**
```json
{
  "found": true,
  "matches": 1,
  "patientId": 123,
  "patientInfo": {
    "name": "John Doe",
    "phone": "(555) 123-4567",
    "lastVisit": "2025-01-10"
  }
}
```

c) **Multiple matches found:**
```json
{
  "found": true,
  "matches": 3,
  "needsMoreInfo": true,
  "message": "Multiple records found. Please provide additional information.",
  "patients": [
    {
      "id": 123,
      "name": "John Doe",
      "lastVisit": "2025-01-10"
    },
    {
      "id": 124,
      "name": "John Doe Jr.",
      "lastVisit": "2024-12-20"
    }
  ]
}
```

**Security:**
- Only searches records where `has_account = FALSE`
- Prevents linking to already-claimed records

#### 2. **POST /select**
Select a specific patient from multiple matches.

**Request Body:**
```json
{
  "patientId": 123,
  "lastVisit": "2025-01-10"  // Optional for additional verification
}
```

**Response:**
```json
{
  "success": true,
  "patientId": 123,
  "patientInfo": {
    "name": "John Doe",
    "phone": "(555) 123-4567",
    "lastVisit": "2025-01-10"
  }
}
```

#### 3. **POST /send-otp**
Send OTP verification code to patient's registered phone number.

**Request Body:**
```json
{
  "patientId": 123
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "phone": "(555) ***-4567"  // Masked for security
}
```

**Implementation Notes:**
- Generates 6-digit OTP
- OTP expires after 10 minutes
- Deletes previous OTPs for the same patient
- Currently logs OTP to console for development (integrate SMS provider for production)

#### 4. **POST /resend-otp**
Resend OTP if user didn't receive it.

**Request Body:**
```json
{
  "patientId": 123
}
```

**Response:**
```json
{
  "success": true,
  "message": "New OTP sent successfully"
}
```

#### 5. **POST /verify-and-link**
Verify OTP and create/link user account to patient record.

**Request Body:**
```json
{
  "patientId": 123,
  "otp": "123456",
  "userData": {
    "username": "johndoe",
    "password": "securepass123",
    "email": "john@example.com"  // Optional
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account linked successfully",
  "token": "jwt_token_here",
  "user": {
    "id": 456,
    "username": "johndoe",
    "role": "patient",
    "fullName": "John Doe",
    "email": "john@example.com",
    "patientId": 123,
    "isFirstLogin": false
  }
}
```

**Transaction Flow:**
1. Verify OTP is valid and not expired
2. Check username doesn't already exist
3. Verify patient record exists and has no account
4. Hash password
5. Create user account
6. Link `user_id` to patient record
7. Set `has_account = TRUE`
8. Mark OTP as verified
9. Generate JWT token
10. Return user data and token

**Security Features:**
- Database transaction ensures atomicity
- Password hashing with bcrypt
- OTP expiration (10 minutes)
- One-time OTP usage (marked as verified)
- Prevents duplicate username registration
- Prevents linking to already-claimed records

### Frontend Components

#### 1. **PatientRecordClaiming.tsx**
Main component managing the claiming flow with multiple steps.

**Props:**
```typescript
{
  onComplete: (user: any, token: string) => void;  // Called after successful linking
  onCancel: () => void;  // Called when user chooses new registration
}
```

**Flow Steps:**

1. **Initial Question**
   - "Do you have an existing record in our clinic?"
   - Options: Yes / No
   - If No → triggers normal registration
   - If Yes → proceeds to search

2. **Search Form**
   - Collects: Full name, Date of birth, Mobile number
   - Validates and searches for matching records
   - Handles three scenarios (no match, single match, multiple matches)

3. **Multiple Matches Selection** (if applicable)
   - Shows list of potential matches
   - Includes last visit date for identification
   - User selects their correct record

4. **OTP Verification**
   - Shows masked phone number
   - 6-digit OTP input
   - Resend OTP option
   - 10-minute expiration notice

5. **Account Creation**
   - Username (required)
   - Password (required, min 6 characters)
   - Confirm password
   - Email (optional)
   - Validation before submission

6. **Success**
   - Confirmation message
   - Auto-redirect to dashboard

**Features:**
- Smooth animations with Framer Motion
- Toast notifications for feedback
- Loading states
- Error handling
- Form validation
- Back navigation

#### 2. **AuthPage.tsx Updates**
Modified to integrate claiming flow for patient signups.

**Changes:**
- Added `showClaimingFlow` state
- Modified `handleSignup` to show claiming flow for patients
- Added `handleClaimingComplete` and `handleClaimingCancel` handlers
- Renders `PatientRecordClaiming` component when appropriate

**Logic:**
```typescript
// On patient signup
if (signupData.role === 'patient') {
  setShowClaimingFlow(true);  // Show claiming flow
  return;
}
// Otherwise, proceed with normal signup for doctor/assistant
```

#### 3. **api.js Updates**
Added new API module for patient claiming endpoints.

```javascript
export const patientClaimingAPI = {
  searchRecords: (data) => { /* POST /search */ },
  selectPatient: (data) => { /* POST /select */ },
  sendOTP: (patientId) => { /* POST /send-otp */ },
  resendOTP: (patientId) => { /* POST /resend-otp */ },
  verifyAndLink: (data) => { /* POST /verify-and-link */ }
};
```

## User Experience Flow

### Scenario 1: Patient with Existing Record

1. Patient clicks "Sign Up"
2. Fills in basic information (name, email, etc.)
3. Selects role: "Patient"
4. Clicks "Create Account"
5. **Claiming flow starts:**
   - Question: "Do you have an existing record?"
   - Patient clicks "Yes, I have a record"
6. **Search form:**
   - Enters: Full name, DOB, phone number
   - Clicks "Search My Record"
7. **System finds match:**
   - Shows patient info (name, last visit)
   - Sends OTP to registered phone
8. **OTP verification:**
   - Patient receives SMS with 6-digit code
   - Enters code in form
   - Clicks "Verify Code"
9. **Account creation:**
   - Enters desired username and password
   - Clicks "Complete Setup"
10. **Success:**
    - Account linked to existing records
    - Auto-login with JWT token
    - Redirected to patient dashboard
    - Can view all historical records

### Scenario 2: Patient with Multiple Matching Records

Steps 1-6 same as Scenario 1, then:

7. **System finds multiple matches:**
   - Shows list: "John Doe - Last visit: 2025-01-10"
   - Shows list: "John Doe Jr. - Last visit: 2024-12-20"
   - Patient selects correct record
8. Continue with OTP verification (same as Scenario 1)

### Scenario 3: Patient with No Existing Record

Steps 1-6 same as Scenario 1, then:

7. **System finds no match:**
   - Message: "No existing record found"
   - Patient clicks back or chooses "No, I'm new"
8. **Normal registration:**
   - Creates new user account
   - Creates new patient record
   - `has_account = TRUE` from start
9. Success: Redirected to login

### Scenario 4: New Patient (No Prior Record)

1. Patient clicks "Sign Up"
2. Fills in registration form
3. **Claiming flow starts:**
   - Question: "Do you have an existing record?"
   - Patient clicks "No, I'm new"
4. **Normal registration proceeds:**
   - Creates user account
   - Creates patient record
   - `has_account = TRUE`
5. Success message: "Account created! Please login."
6. Switches to login screen

## Security Features

### 1. **OTP Verification**
- 6-digit random code
- 10-minute expiration
- One-time use (marked as verified after use)
- Stored in separate table with indexes for performance

### 2. **Account Linking Protection**
- `has_account` flag prevents duplicate linking
- Only searches records without accounts
- Transaction ensures atomic linking operation

### 3. **Data Validation**
- All inputs validated on frontend and backend
- Username uniqueness check
- Password strength requirement (min 6 characters)
- Phone number format validation

### 4. **Authentication**
- Password hashing with bcrypt (10 rounds)
- JWT token with 24-hour expiration
- Token includes patientId for quick record access

### 5. **Privacy**
- Phone number masking in UI ((555) ***-4567)
- OTP sent only to registered phone number
- No exposure of sensitive patient data during search

## Database Migration

To apply changes to existing database:

```bash
mysql -u root -p dental_clinic < backend/migrate-patient-claiming.sql
```

This migration:
1. Adds `has_account` column to patients table
2. Creates `otp_verifications` table
3. Updates existing patients with user_id to `has_account = TRUE`
4. Reports migration results

## SMS Integration (TODO)

Current implementation logs OTPs to console for development.

**To integrate production SMS:**

1. Install SMS provider SDK:
```bash
npm install twilio  # or your preferred provider
```

2. Update `sendSMS` function in `routes/patient-claiming.js`:
```javascript
async function sendSMS(phone, message) {
  const twilio = require('twilio');
  const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  
  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to: phone
    });
    return { success: true, message: 'SMS sent' };
  } catch (error) {
    console.error('SMS error:', error);
    return { success: false, error: error.message };
  }
}
```

3. Add to `.env`:
```
TWILIO_SID=your_account_sid
TWILIO_TOKEN=your_auth_token
TWILIO_PHONE=+15551234567
```

## Testing Checklist

### Backend Tests
- [ ] Search with valid patient data
- [ ] Search with no matching records
- [ ] Search with multiple matches
- [ ] Send OTP to valid patient
- [ ] Verify valid OTP
- [ ] Verify expired OTP
- [ ] Verify used OTP
- [ ] Link account with valid data
- [ ] Prevent duplicate username
- [ ] Prevent linking to claimed record

### Frontend Tests
- [ ] Initial question UI
- [ ] Search form validation
- [ ] Multiple matches selection
- [ ] OTP input (6 digits only)
- [ ] Resend OTP functionality
- [ ] Account creation validation
- [ ] Password match validation
- [ ] Success and error messages
- [ ] Back navigation
- [ ] Loading states

### Integration Tests
- [ ] Complete flow: existing record found
- [ ] Complete flow: no record found
- [ ] Complete flow: multiple matches
- [ ] New patient registration
- [ ] Doctor/assistant registration (bypass claiming)
- [ ] Auto-login after successful linking
- [ ] Patient can view old records after linking

## Files Modified/Created

### Backend
- ✅ `backend/schema.sql` - Added has_account field and otp_verifications table
- ✅ `backend/migrate-patient-claiming.sql` - Database migration script
- ✅ `backend/routes/patient-claiming.js` - New claiming API endpoints
- ✅ `backend/routes/auth.js` - Updated to set has_account = TRUE for new patients
- ✅ `backend/server.js` - Added patient-claiming route

### Frontend
- ✅ `src/api.js` - Added patientClaimingAPI module
- ✅ `src/components/PatientRecordClaiming.tsx` - New claiming flow component
- ✅ `src/components/AuthPage.tsx` - Integrated claiming flow for patients

### Documentation
- ✅ `PATIENT_CLAIMING_IMPLEMENTATION.md` - This file

## Future Enhancements

1. **Multi-factor Authentication**
   - Email verification as secondary factor
   - Security questions for additional verification

2. **Advanced Matching**
   - Fuzzy name matching for spelling variations
   - Birthdate range matching (±1 day for errors)
   - Additional identifiers (address, email)

3. **Audit Trail**
   - Log all claiming attempts
   - Track successful and failed verifications
   - Admin dashboard for monitoring

4. **Patient Notifications**
   - Email confirmation after account linking
   - SMS notification when records are accessed
   - Alert if claiming attempt fails multiple times

5. **Rate Limiting**
   - Limit OTP requests per phone number
   - Prevent brute-force OTP attempts
   - Temporary lockout after failed attempts

6. **Admin Tools**
   - Manual account linking by staff
   - Dispute resolution interface
   - Bulk import of old records

## Support & Troubleshooting

### Common Issues

**Issue**: OTP not received
- **Solution**: Check phone number format, verify SMS provider credentials, check OTP expiration

**Issue**: Multiple matches always returned
- **Solution**: Ensure patient data is consistent, check search query LIKE wildcards

**Issue**: Cannot link account - "Already has account"
- **Solution**: Check `has_account` flag, verify patient record isn't already linked

**Issue**: Patient can't see old records after linking
- **Solution**: Verify `user_id` is correctly set in patients table, check JWT token includes patientId

### Debug Mode

To enable debug logging, add to `routes/patient-claiming.js`:
```javascript
const DEBUG = process.env.DEBUG_CLAIMING === 'true';

if (DEBUG) {
  console.log('[CLAIMING]', 'Step:', step, 'Data:', data);
}
```

## Conclusion

This implementation provides a secure, user-friendly way for patients to claim their existing records while maintaining data integrity and preventing unauthorized access. The system balances security (OTP verification) with usability (simple multi-step flow) and provides clear feedback at every step.
