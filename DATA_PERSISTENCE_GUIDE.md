# Data Persistence Guide

## Overview
The Dental Clinic Management System has **complete data persistence** enabled. All data you enter in the application is automatically saved to the MySQL database and will be available when you close and reopen the application.

## How Data Persistence Works

### 1. **Frontend Data Saving**
When you create or modify patient records in the web interface:
- Data is sent to the backend API via HTTP requests
- The frontend displays a success toast notification
- State is updated in React to reflect the change immediately

**Examples:**
- Adding a new patient → `POST /api/patients`
- Updating a patient → `PUT /api/patients/{id}`
- Adding an appointment → `POST /api/appointments`
- Recording treatment → Stored in `treatment_records` table

### 2. **Backend Processing**
The Node.js/Express backend receives the data and:
- Validates the data structure
- Checks user authentication (JWT token)
- Inserts/updates data into MySQL database
- Returns success/error response to frontend

**Location:** `backend/routes/`
- `patients.js` - Patient CRUD operations
- `appointments.js` - Appointment management
- `inventory.js` - Inventory tracking
- `referrals.js` - Referral management

### 3. **Database Storage (MySQL)**
All data is permanently stored in the `dental_clinic` database with these core tables:

#### **Patients Table**
```sql
CREATE TABLE patients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  dateOfBirth DATE,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  sex ENUM('Male', 'Female'),
  medicalHistory TEXT,
  allergies TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

#### **Treatment Records Table**
```sql
CREATE TABLE treatment_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patientId INT NOT NULL,
  date DATE,
  treatment VARCHAR(255),
  tooth VARCHAR(10),
  notes TEXT,
  cost DECIMAL(10, 2),
  dentist VARCHAR(100),
  FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
)
```

#### **Appointments Table**
```sql
CREATE TABLE appointments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patientId INT NOT NULL,
  date DATE,
  time TIME,
  type VARCHAR(100),
  duration INT,
  status ENUM('scheduled', 'completed', 'cancelled'),
  notes TEXT,
  FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
)
```

#### **Inventory Table**
```sql
CREATE TABLE inventory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  category VARCHAR(50),
  quantity INT,
  minQuantity INT,
  unit VARCHAR(20),
  supplier VARCHAR(100),
  cost DECIMAL(10, 2)
)
```

### 4. **Session Persistence**
When you log in:
- Your JWT authentication token is stored in browser's `localStorage`
- Your user information is stored in `localStorage`
- Both persist across browser sessions

**Storage:** `window.localStorage`
- `token` - JWT token for API authentication
- `user` - User object with role and permissions

### 5. **Data Reload on App Start**
When you reopen the application:

1. **Check for existing session:**
   ```javascript
   const token = localStorage.getItem('token');
   const user = localStorage.getItem('user');
   ```

2. **If logged in, fetch all data:**
   ```javascript
   loadAllData() → Promise.all([
     patientAPI.getAll(),        // Fetch all patients
     appointmentAPI.getAll(),     // Fetch all appointments
     inventoryAPI.getAll(),       // Fetch all inventory
     referralAPI.getAll()         // Fetch all referrals
   ])
   ```

3. **Populate React state with database records**

4. **Display to user with all previous data intact**

## What Gets Saved

### ✅ **Automatically Saved:**
- ✓ Patient records (name, contact, medical history, allergies)
- ✓ Appointments (date, time, type, status)
- ✓ Treatment records (procedure, tooth, cost, dentist)
- ✓ Inventory items (supplies, quantities, costs)
- ✓ Referrals (specialist referrals with dates)
- ✓ User login session (credentials valid for 24 hours)
- ✓ Balance calculations (computed from treatment records)
- ✓ Announcements (promos, closures, important notices)

### ✓ **Real-Time Sync:**
The application includes an auto-refresh mechanism:
- Patient data refreshes every 30-60 seconds
- Changes by other users (doctors/assistants) appear automatically
- Manual refresh available via "Refresh Data" buttons

## Testing Data Persistence

### Test Scenario 1: Adding a Patient
1. Log in to the application
2. Go to Patient Management
3. Add a new patient with name, phone, email, etc.
4. Click "Add Patient" → Success toast appears
5. **Close the browser completely**
6. **Reopen the application**
7. **Log back in**
8. **Navigate to Patient Management**
9. ✓ The patient you added is still there!

### Test Scenario 2: Recording Treatment
1. Log in as a doctor
2. Go to Patient Management
3. Select a patient
4. Record a treatment with cost
5. **Close the application**
6. **Reopen and log in**
7. ✓ Treatment is saved, patient balance reflects the cost

### Test Scenario 3: Creating Appointments
1. Log in as a doctor
2. Go to Appointment Scheduler
3. Create an appointment for a patient
4. **Close the application**
5. **Reopen and log in**
6. ✓ Appointment is still scheduled

## Database Connection

The backend connects to MySQL using the configuration in `backend/config/database.js`:

```javascript
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // Default XAMPP password (empty)
  database: 'dental_clinic',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

**Requirements:**
- XAMPP must be running
- MySQL service must be active
- `dental_clinic` database must be initialized (run `init-db.js`)

## Backend Server Requirements

The backend server must be running for data to be saved:

```bash
cd backend
npm install
npm start
# Server runs on http://localhost:5000
```

**Important:** If the backend server is not running:
- ❌ Data will NOT be saved
- ❌ You won't see "success" messages
- ❌ Changes will only exist in your browser session

## Troubleshooting Data Loss

### Problem: Data not saving when I add a patient
**Solution:**
1. Check if backend server is running: `npm start` in `backend/` folder
2. Check if MySQL is running in XAMPP Control Panel
3. Check browser console for error messages (F12)
4. Verify token is valid (check localStorage in DevTools)

### Problem: Data missing after reopening the app
**Possible Causes:**
- Browser localStorage was cleared
- Database connection failed during the session
- User session expired (after 24 hours)

**Solution:**
1. Don't clear browser data/cache
2. Ensure MySQL and backend are running
3. Log in again to refresh the session

### Problem: One user's changes not visible to another user
**Solution:**
- The app has auto-refresh every 30-60 seconds
- Click "Refresh Data" button in the interface for immediate sync
- Both users must have valid authentication tokens

## Data Backup

To backup your patient data:

```bash
# Export database to SQL file
mysqldump -u root dental_clinic > backup.sql

# Later, restore from backup
mysql -u root dental_clinic < backup.sql
```

## Conclusion

**Your data is safe!** The system uses:
1. ✓ MySQL database for permanent storage
2. ✓ Backend API for all CRUD operations
3. ✓ JWT authentication for secure access
4. ✓ LocalStorage for session persistence
5. ✓ Auto-refresh for real-time synchronization

**All patient records, appointments, treatments, and inventory items are permanently saved and will be available whenever you log back in.**
