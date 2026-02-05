# Referred Patient Workflow - Implementation Complete

## Feature Overview

This document describes the complete implementation of the **Referred Patient Workflow** feature for the DentaCare clinic system. The feature enables patients to be classified as either direct consultations or referred by external doctors/dentists, with seamless tracking and documentation of referrals throughout the system.

---

## Feature Components

### 1. **Signup Logic**

#### Location: `src/components/AuthPage.tsx`

**Two New Fields Added to Patient Signup:**

1. **Patient Type Selection** ("How are you scheduling your consultation?")
   - Direct Consultation with Doc Maaño
   - Referred by another doctor/dentist to Doc Maaño

2. **Existing Record Status** ("Do you have an existing record with us?")
   - Yes, I have a record
   - No prior record

**Implementation Details:**
- Both fields are **required** before signup can proceed
- Questions are presented with visual buttons for clear selection
- Helpful descriptions guide users based on their selections
- Data is stored in `SignupData` type:
  ```typescript
  patientType?: 'direct' | 'referred';
  hasExistingRecord?: boolean;
  ```

**User Flow:**
1. Patient selects patient type (direct/referred)
2. Patient indicates if they have existing record
3. Patient continues with standard signup fields
4. Data is passed to patient claiming flow
5. New patient record is created with referral information

---

### 2. **Patient Portal – Referral Document Upload**

#### Location: `src/components/PatientPortal.tsx`

**Referral Upload Form (Conditional):**
- Only visible to patients with `patientType === 'referred'`
- Appears in the **Forms section** of the patient portal

**Features:**
- **Drag-and-drop file upload** interface
- **Supported file types:**
  - Images: PNG, JPG, GIF
  - Documents: PDF, DOC, DOCX, XLS, XLSX
- **Maximum file size:** 10MB per file
- **Multiple file uploads** supported simultaneously

**File Management:**
- View uploaded files with timestamps
- Delete individual files with single click
- Files are stored with metadata (filename, type, upload date)

**Implementation:**
```typescript
// State management
const [referralFiles, setReferralFiles] = useState<any[]>(patient.referralFiles || []);
const [showReferralUploadModal, setShowReferralUploadModal] = useState(false);
const [isUploadingReferral, setIsUploadingReferral] = useState(false);
const [referralUploadFiles, setReferralUploadFiles] = useState<File[]>([]);

// Upload handler
const handleReferralFileUpload = async () { ... }

// Delete handler
const handleRemoveReferralFile = async (fileId: string) { ... }
```

---

### 3. **Doctor Dashboard – Referrals Management Section**

#### Location: `src/components/DoctorDashboard.tsx` & `src/components/ReferralManagement.tsx`

**Combined View with Two Sections:**

#### Section 1: Referral Management (View All Referrals)
- New dedicated component: `ReferralManagement.tsx`
- **Three filter tabs:**
  1. **All Referrals** - Shows all system referrals
  2. **Incoming Referrals** - Referrals received from other doctors
  3. **Outgoing Referrals** - Referrals created by Doc Maaño

**Incoming Referral Badge:**
- Green badge with left-arrow icon: "Incoming Referral"
- Indicates referral from external doctor to Doc Maaño

**Outgoing Referral Badge:**
- Purple badge with right-arrow icon: "Outgoing Referral"
- Indicates referral created by Doc Maaño to other specialists

**Additional Information Displayed:**
- Patient name and date of birth
- Referral direction (From/To specialist)
- Specialty/department
- Reason for referral
- Urgency level (Routine, Urgent, Emergency)
- Referral date
- Attached files count
- PDF export button

**Referral Card Design:**
```
┌─────────────────────────────────────────────────────┐
│ [Incoming/Outgoing Badge] [Urgency Badge] [Date]   │
│                                                     │
│ Patient: John Doe (DOB: 15 Jan 1985)               │
│ Referred From: Dr. Smith | Specialty: Orthodontics│
│ Reason: Needs braces evaluation                     │
│                                                     │
│ [Attached Files: 2] [Export PDF]                   │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Real-time filtering
- Sort by date (newest first)
- Animated transitions
- Mobile-responsive
- Empty state messaging

#### Section 2: Referral Generation (Create New Referrals)
- Existing `ReferralGeneration.tsx` component
- **Automatically marks new referrals as "outgoing"**
- Allows creating referrals to external specialists
- Supports doctor and X-ray referrals

**Integration:**
```tsx
{activeTab === 'referrals' && (
  <div className="p-6 space-y-6">
    {/* View and Filter */}
    <ReferralManagement
      referrals={referrals}
      patients={patients}
      currentUserName={currentUser.fullName}
    />
    
    {/* Create New */}
    <ReferralGeneration
      referrals={referrals}
      setReferrals={setReferrals}
      patients={patients}
    />
  </div>
)}
```

---

## Database Schema Updates

### Migration File: `backend/migrate-referral-workflow.js`

**Run the migration:**
```bash
node migrate-referral-workflow.js
```

### Database Changes:

#### 1. **Referrals Table Enhancements**
```sql
ALTER TABLE referrals ADD COLUMN:
- referralType ENUM('incoming', 'outgoing') DEFAULT 'outgoing'
- xrayDiagramSelections JSON DEFAULT NULL
- xrayNotes TEXT DEFAULT NULL
```

#### 2. **Patients Table Enhancements**
```sql
ALTER TABLE patients ADD COLUMN:
- patientType ENUM('direct', 'referred') DEFAULT 'direct'
- hasExistingRecord BOOLEAN DEFAULT FALSE
```

#### 3. **New Referral Files Table**
```sql
CREATE TABLE referral_files (
  id INT PRIMARY KEY AUTO_INCREMENT,
  referralId INT,
  patientId INT,
  fileName VARCHAR(255) NOT NULL,
  fileType ENUM('image', 'pdf', 'document') NOT NULL,
  filePath VARCHAR(500) NOT NULL,
  fileSize INT,
  uploadedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploadedBy INT,
  FOREIGN KEY (referralId) REFERENCES referrals(id),
  FOREIGN KEY (patientId) REFERENCES patients(id),
  FOREIGN KEY (uploadedBy) REFERENCES users(id)
);
```

---

## Backend API Enhancements

### File: `backend/routes/referrals.js`

**New Endpoints:**

#### 1. **Upload Referral File**
```http
POST /api/referrals/upload
Content-Type: multipart/form-data

Parameters:
- file: File (image/pdf/document)
- patientId: number
- fileType: 'image' | 'pdf' | 'document'

Response:
{
  id: "file-id",
  patientId: number,
  fileName: string,
  fileType: string,
  uploadedDate: ISO8601,
  url: "/uploads/referrals/filename"
}
```

#### 2. **Delete Referral File**
```http
DELETE /api/referrals/file/:fileId

Response:
{ message: "File deleted successfully" }
```

**Updated Endpoints:**

#### Create Referral (Enhanced)
```javascript
POST /api/referrals/

New Fields in Request Body:
- referralType: 'incoming' | 'outgoing' (auto-set to 'outgoing' when created by staff)
- xrayDiagramSelections: JSON
- xrayNotes: string
- uploadedFiles: Array<{id, fileName, fileType, uploadedDate, url}>
```

#### Get Referrals
- Includes new fields in response
- Parses JSON fields automatically
- Available for both GET / and GET /patient/:patientId

---

## Type Definitions

### Extended Types (src/App.tsx)

#### SignupData
```typescript
export type SignupData = {
  // ... existing fields ...
  patientType?: 'direct' | 'referred';
  hasExistingRecord?: boolean;
};
```

#### Patient
```typescript
export type Patient = {
  // ... existing fields ...
  patientType?: 'direct' | 'referred';
  hasExistingRecord?: boolean;
  referralFiles?: {
    id: string;
    fileName: string;
    fileType: string;
    uploadedDate: string;
    url: string;
  }[];
};
```

#### Referral
```typescript
export type Referral = {
  // ... existing fields ...
  referralType?: 'incoming' | 'outgoing';
  uploadedFiles?: {
    id: string;
    fileName: string;
    fileType: string;
    uploadedDate: string;
    url: string;
  }[];
  xrayDiagramSelections?: Record<string, 'black' | 'red'>;
  xrayNotes?: string;
};
```

---

## Component Files

### Frontend Components Created/Modified

1. **AuthPage.tsx** (Modified)
   - Added referral type selection UI
   - Added existing record status selection UI
   - Updated validation logic
   - Updated SignupData type

2. **PatientPortal.tsx** (Modified)
   - Added referral upload section
   - Added file management handlers
   - Conditional display for referred patients only
   - File upload/delete state management

3. **ReferralManagement.tsx** (New)
   - Complete referral viewing and filtering
   - Incoming vs outgoing differentiation
   - Color-coded badges
   - Urgency indicators
   - PDF export buttons
   - Empty state handling

4. **DoctorDashboard.tsx** (Modified)
   - Integrated ReferralManagement component
   - Two-section referrals tab layout
   - Display both create and view functionality

5. **ReferralGeneration.tsx** (Modified)
   - Auto-mark new referrals as 'outgoing'
   - Support for referral type tracking

### Backend Routes

1. **routes/referrals.js** (Enhanced)
   - File upload endpoint
   - File deletion endpoint
   - Updated create/update with new fields
   - Enhanced parsing of JSON fields

2. **routes/patients.js** (Modified)
   - Support new patient type fields
   - Support hasExistingRecord field

---

## Feature Constraints & Guarantees

### ✅ What's Included

1. ✓ Signup workflow with patient type selection
2. ✓ Existing record status tracking
3. ✓ Referral document upload in patient portal
4. ✓ Multi-file upload support
5. ✓ File management (view, delete)
6. ✓ Clear incoming/outgoing referral distinction
7. ✓ Color-coded visual indicators
8. ✓ Urgency level badges
9. ✓ All patients included in main patient list
10. ✓ No changes to unrelated features

### ✅ What's NOT Changed

1. ✓ Existing signup/patient list features remain intact
2. ✓ Treatment records unaffected
3. ✓ Appointment scheduling unaffected
4. ✓ Inventory management unaffected
5. ✓ Financial reporting unaffected
6. ✓ Authentication system unaffected

---

## Setup & Deployment Instructions

### 1. **Database Migration**
```bash
cd backend
node migrate-referral-workflow.js
```

### 2. **Install Dependencies (if needed)**
```bash
# Ensure multer is installed for file uploads
npm install multer
```

### 3. **Create Uploads Directory**
```bash
# The system auto-creates: backend/uploads/referrals/
# Ensure write permissions on this directory
chmod 755 backend/uploads
```

### 4. **Restart Backend Server**
```bash
npm start
# or
node server.js
```

### 5. **Frontend Ready**
- No additional setup needed
- Frontend changes are automatically compiled

---

## Testing Workflow

### Test Case 1: Direct Patient Signup
1. Go to signup page
2. Select "Direct Consultation"
3. Select "No prior record"
4. Complete signup
5. ✓ Patient created with `patientType='direct'`

### Test Case 2: Referred Patient Signup
1. Go to signup page
2. Select "Referred by a Doctor"
3. Select "No prior record"
4. Complete signup
5. ✓ Patient created with `patientType='referred'`
6. Log in as patient
7. Go to Forms section
8. Upload referral document
9. ✓ File appears in uploaded files list

### Test Case 3: Doctor Creates Outgoing Referral
1. Log in as doctor
2. Go to Referrals tab
3. Scroll to "Create New Referral"
4. Create a referral
5. ✓ Appears in "Outgoing" filter with correct badge
6. Badge shows: Purple "Outgoing Referral" with right arrow

### Test Case 4: View Filtered Referrals
1. Go to Referrals > All Referrals section
2. Outgoing referrals should show purple badges
3. Click "Incoming" filter
4. Only incoming referrals appear
5. Click "Outgoing" filter
6. Only outgoing referrals appear

---

## File Structure Summary

```
Frontend:
src/
├── components/
│   ├── AuthPage.tsx                 [MODIFIED]
│   ├── PatientPortal.tsx            [MODIFIED]
│   ├── ReferralManagement.tsx        [NEW]
│   ├── ReferralGeneration.tsx        [MODIFIED]
│   └── DoctorDashboard.tsx           [MODIFIED]
└── App.tsx                           [MODIFIED - Types]

Backend:
backend/
├── routes/
│   ├── referrals.js                 [ENHANCED]
│   └── patients.js                  [MODIFIED]
├── migrate-referral-workflow.js      [NEW]
├── schema.sql                        [Reference - no changes]
└── uploads/
    └── referrals/                    [Auto-created]
```

---

## API Response Examples

### Upload Referral File Response
```json
{
  "id": "file_12345",
  "patientId": 42,
  "fileName": "referral_from_dr_smith.pdf",
  "fileType": "pdf",
  "uploadedDate": "2026-02-05T10:30:00Z",
  "url": "/uploads/referrals/file_12345.pdf"
}
```

### Referral with Incoming Type Response
```json
{
  "id": 1001,
  "patientId": 42,
  "patientName": "John Doe",
  "referringDentist": "Dr. Smith",
  "referredEvery": "Doc Maaño",
  "specialty": "Orthodontics",
  "reason": "Braces evaluation",
  "date": "2026-02-05",
  "urgency": "routine",
  "referralType": "incoming",
  "uploadedFiles": [
    {
      "id": "file_12345",
      "fileName": "referral_from_dr_smith.pdf",
      "fileType": "pdf",
      "uploadedDate": "2026-02-05T10:30:00Z",
      "url": "/uploads/referrals/file_12345.pdf"
    }
  ],
  "createdByRole": "patient"
}
```

---

## Known Limitations & Future Enhancements

### Current Limitations:
1. File uploads limited to 10MB per file
2. Referral files stored on local filesystem (not cloud)
3. No automatic email notifications for incoming referrals

### Potential Future Enhancements:
1. Integration with external doctor database for referrals
2. Automated email notifications
3. Referral approval workflow
4. Referral completion tracking
5. Insurance verification for referred patients
6. Analytics dashboard for referral sources

---

## Troubleshooting

### Issue: Referral upload returns "Invalid file type"
**Solution:** Ensure files are: PNG, JPG, GIF (images) or PDF, DOC, DOCX, XLS, XLSX (documents)

### Issue: Upload directory not writable
**Solution:** 
```bash
chmod 755 backend/uploads
chmod 755 backend/uploads/referrals
```

### Issue: Referral type not saving correctly
**Solution:** Ensure migration was run:
```bash
node backend/migrate-referral-workflow.js
```

### Issue: Referral upload section not visible to patient
**Solution:** Verify patient was created with `patientType='referred'` during signup

---

## Summary

The Referred Patient Workflow feature is now fully implemented with:
- ✅ Complete patient type selection during signup
- ✅ Referral document upload capability in patient portal
- ✅ Incoming/outgoing referral differentiation with clear visual indicators
- ✅ Full backend API support with file management
- ✅ No changes to unrelated features
- ✅ Production-ready code with proper error handling

**Total Implementation Time:** Complete
**Status:** Ready for Testing & Deployment
