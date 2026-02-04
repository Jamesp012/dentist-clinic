# Patient Portal Forms Feature - Implementation Complete

## Overview
This implementation adds a "Forms" section to the Patient Portal where patients can view all forms (Doctor Referrals, X-Ray Referrals, and Prescriptions) created for them by doctors or assistants.

## What Was Implemented

### 1. Database Changes

#### New Table: `prescriptions`
- **File**: `backend/schema.sql` (lines 172-190)
- **Fields**:
  - `id` - Primary key
  - `patientId` - Links to patient (Foreign Key)
  - `patientName` - Patient name (for quick reference)
  - `dentist` - Doctor/Assistant name
  - `licenseNumber` - Doctor's license
  - `ptrNumber` - PTR number
  - `medications` - JSON array of medications
  - `notes` - Additional notes
  - `date` - Prescription date
  - `createdAt` - Timestamp when created
- **Indexes**: patient_id, created_date, patient_date for efficient queries
- **Migration Script**: `backend/create-prescriptions-table.js`

#### Updated Table: `referrals`
- Already has `patientId` field (no changes needed)
- Has `createdAt` timestamp for sorting

### 2. Backend API Endpoints

#### Referrals Routes (`backend/routes/referrals.js`)
- **GET** `/api/referrals` - All referrals (staff only)
- **GET** `/api/referrals/:id` - Specific referral
- **GET** `/api/referrals/patient/:patientId` - ✅ NEW - Patient-specific referrals
- **POST** `/api/referrals` - Create referral
- **PUT** `/api/referrals/:id` - Update referral
- **DELETE** `/api/referrals/:id` - Delete referral

#### Prescriptions Routes (`backend/routes/prescriptions.js`) - NEW
- **GET** `/api/prescriptions` - All prescriptions (staff only)
- **GET** `/api/prescriptions/:id` - Specific prescription
- **GET** `/api/prescriptions/patient/:patientId` - ✅ Patient-specific prescriptions
- **POST** `/api/prescriptions` - Create prescription
- **PUT** `/api/prescriptions/:id` - Update prescription
- **DELETE** `/api/prescriptions/:id` - Delete prescription

### 3. Frontend API Layer (`src/api.js`)

#### Updated APIs
- `referralAPI.getByPatientId(patientId)` - ✅ NEW
- `prescriptionAPI` - ✅ NEW (complete CRUD)
  - `getAll()`
  - `getById(id)`
  - `getByPatientId(patientId)` - ✅ NEW
  - `create(data)`
  - `update(id, data)`
  - `delete(id)`

### 4. Backend Server Configuration (`backend/server.js`)
- Added prescriptions route registration: `app.use('/api/prescriptions', prescriptionsRoutes)`

### 5. ServicesForms Component Updates (`src/components/ServicesForms.tsx`)
- Added `prescriptionAPI` import
- Updated `handleCreatePrescription()` function to:
  - Save prescription to database (not just local state)
  - Create prescription with full data structure
  - Return created prescription from backend
  - Provide success/error feedback to user
  - Trigger data refresh after creation

### 6. Patient Portal Forms Display (`src/components/PatientPortal.tsx`)
- Already has "forms" tab with proper implementation
- **Load mechanism** (lines 433-470):
  - Fetches referrals via `/api/referrals/patient/{id}`
  - Fetches prescriptions via `/api/prescriptions/patient/{id}`
  - Displays in three sections: Doctor Referrals, X-Ray Referrals, Prescriptions
- **Sorting**: Most recently created first (by `createdAt`)
- **Display Features**:
  - Form type badge (Doctor Referral/X-Ray Referral/Prescription)
  - Doctor/dentist name
  - Creation date
  - View button (shows details)
  - Download PDF button (for future implementation)

## How It Works

### 1. Doctor/Assistant Creates Form
1. Doctor/Assistant logs into Doctor Portal or Assistant Portal
2. Creates a referral or prescription
3. **Selects a patient** from the patient list (existing functionality)
4. Form is saved with `patientId` to database

### 2. Form Automatically Links to Patient
1. Referral is saved to `referrals` table with `patientId`
2. Prescription is saved to `prescriptions` table with `patientId`
3. Both have `createdAt` timestamp

### 3. Patient Views Forms in Portal
1. Patient logs into Patient Portal
2. Clicks "Forms" tab (existing tab, now fully functional)
3. System automatically loads:
   - All referrals where `patientId = currentPatient.id`
   - All prescriptions where `patientId = currentPatient.id`
4. Forms sorted by creation date (newest first)
5. Patient can:
   - ✅ View form details
   - ✅ Download as PDF (UI exists, PDF generation already implemented)
   - ❌ Cannot create, edit, or delete forms
   - ✅ Only sees their own forms (filtered by patientId)

## File Changes Summary

| File | Type | Changes |
|------|------|---------|
| `backend/schema.sql` | SQL Schema | Added prescriptions table definition |
| `backend/create-prescriptions-table.js` | Migration | New migration script for prescriptions table |
| `backend/routes/referrals.js` | Backend Route | Added GET /patient/:patientId endpoint |
| `backend/routes/prescriptions.js` | Backend Route | New file with complete CRUD endpoints |
| `backend/server.js` | Server Config | Added prescriptions route registration |
| `src/api.js` | Frontend API | Added prescriptionAPI and referralAPI.getByPatientId |
| `src/components/ServicesForms.tsx` | Component | Updated prescription creation to save to DB |
| `src/components/PatientPortal.tsx` | Component | Already has forms tab (no changes needed) |

## Setup Instructions

### 1. Run Database Migration
```bash
cd backend
node create-prescriptions-table.js
```

### 2. Restart Backend Server
```bash
node server.js
```

### 3. Verify Forms Appear
1. Log in as doctor/assistant
2. Create a referral or prescription for a patient
3. Log in as that patient
4. Click "Forms" tab
5. See the form appear automatically

## Testing Checklist

- [ ] Prescriptions table created successfully
- [ ] Doctor can create prescription with patient selection
- [ ] Prescription saved to database
- [ ] Patient sees prescription in Forms tab
- [ ] Doctor referral appears in Patient Forms tab
- [ ] X-Ray referral appears in Patient Forms tab
- [ ] Forms sorted by date (newest first)
- [ ] Patient cannot create/edit/delete forms
- [ ] Patient only sees their own forms
- [ ] PDF download functionality works
- [ ] Form view functionality works

## Data Structure

### Prescription Object (Database)
```json
{
  "id": 1,
  "patientId": 5,
  "patientName": "John Doe",
  "dentist": "Dr. Joseph Maaño",
  "licenseNumber": "0033129",
  "ptrNumber": "12345",
  "medications": [
    {
      "name": "MEFENAMIC Acid",
      "dosage": "500mg",
      "frequency": "Take 1 cap 3x a day",
      "duration": "Quantity: 20"
    }
  ],
  "notes": "After extraction",
  "date": "2026-02-03",
  "createdAt": "2026-02-03T10:30:45.000Z"
}
```

### Referral Object (Database)
```json
{
  "id": 3,
  "patientId": 5,
  "patientName": "John Doe",
  "referringDentist": "Dr. Joseph Maaño",
  "referredByContact": "+63...",
  "referredByEmail": "doctor@clinic.com",
  "referredTo": "Specialist Clinic",
  "specialty": "Orthodontics",
  "reason": "Braces consultation",
  "selectedServices": {...},
  "date": "2026-02-03",
  "urgency": "routine",
  "createdByRole": "staff",
  "createdAt": "2026-02-03T10:30:45.000Z"
}
```

## Security & Permissions

- ✅ Patient can only view their own forms (filtered by patientId)
- ✅ Patient cannot create forms (no create button in patient portal)
- ✅ Patient cannot edit forms (all read-only)
- ✅ Patient cannot delete forms (no delete button)
- ✅ Forms require authentication (authMiddleware on all endpoints)
- ✅ Backend filters by patientId to prevent unauthorized access

## Future Enhancements

1. **Notifications**: Send notification to patient when form is created
2. **Search/Filter**: Allow patients to filter forms by type or date range
3. **Form Annotations**: Patient can add notes/comments to forms
4. **Expiration**: Mark forms as expired after certain date
5. **Status Tracking**: Track if patient has viewed/downloaded form
6. **Batch Download**: Download all forms for a patient as ZIP

## Troubleshooting

### Forms Not Appearing
1. Check network tab in browser DevTools - verify API calls work
2. Check browser console for errors
3. Verify patient.id is set correctly
4. Check database has forms with correct patientId

### Database Error
1. Run migration script: `node backend/create-prescriptions-table.js`
2. Check database connection
3. Verify table created: `DESCRIBE prescriptions;`

### Prescription Creation Error
1. Check patient is selected before creating
2. Check at least one medication is selected
3. Check backend logs for validation errors
