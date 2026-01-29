# Getting the Dental Clinic App Working

## Quick Start Guide

### Step 1: Start the Backend Server

Open a new Command Prompt or PowerShell window and run:

```bash
cd c:\xampp\htdocs\DENTAL WEBSITE1\backend
npm install
node server.js
```

Expected output: `Server running on port 5000`

### Step 2: Start the Frontend Dev Server

Open another Command Prompt or PowerShell window and run:

```bash
cd c:\xampp\htdocs\DENTAL WEBSITE1
npm install
npm run dev
```

Expected output will show: `VITE v5.4.21 ready in XXX ms` and the URL like `http://localhost:5174`

### Step 3: Open the App

Open your browser and go to: **http://localhost:5174**

### Step 4: Login

Use one of these test credentials:

**Doctor Account:**
- Username: `doctor`
- Password: `doctor123`

**Assistant Account:**
- Username: `assistant`
- Password: `assistant123`

---

## Project Architecture

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS
- **Port**: 5174

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL/MariaDB
- **Port**: 5000
- **Auth**: JWT tokens with bcryptjs password hashing

### Database
- **Name**: `dental_clinic`
- **User**: `root` (no password by default in XAMPP)
- **Tables**: 10 tables (users, patients, appointments, inventory, etc.)

---

## API Endpoints

All endpoints require JWT authentication (except login/register)

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user

### Patients
- `GET /api/patients` - Get all patients
- `GET /api/patients/:id` - Get patient by ID
- `POST /api/patients` - Create patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### Appointments
- `GET /api/appointments` - Get all appointments
- `GET /api/appointments/:id` - Get appointment by ID
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Delete appointment

### Inventory
- `GET /api/inventory` - Get all inventory items
- `GET /api/inventory/:id` - Get item by ID
- `POST /api/inventory` - Create item
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item

---

## File Structure

```
src/
├── App.tsx              # Main app component with routing and state
├── components/          # React components (AuthPage, Dashboard, etc.)
├── api.js              # API service layer - handles all backend calls
└── styles/             # Global styles and Tailwind setup

backend/
├── server.js           # Express app entry point
├── config/
│   └── database.js     # MySQL connection pool
├── middleware/
│   └── auth.js        # JWT authentication middleware
├── routes/
│   ├── auth.js        # Login/register endpoints
│   ├── patients.js    # Patient CRUD endpoints
│   ├── appointments.js # Appointment CRUD endpoints
│   └── inventory.js   # Inventory CRUD endpoints
├── package.json       # Backend dependencies
├── .env              # Environment variables
└── setup.sql         # Database schema (already executed)
```

---

## Troubleshooting

### "Cannot connect to server" when logging in
- Make sure backend is running on port 5000
- Check console output for errors
- Verify MySQL is running in XAMPP

### "Port 5174 already in use"
```bash
# Kill process on port 5174
netstat -ano | findstr :5174
taskkill /PID <process_id> /F
```

### Database errors
- Make sure MySQL service is running in XAMPP
- Verify database exists: `mysql -u root -e "USE dental_clinic;"`

### Dependencies not found
```bash
# Reinstall dependencies
cd c:\xampp\htdocs\DENTAL WEBSITE1
npm install

cd backend
npm install
```

---

## Testing the Login Flow

1. Open http://localhost:5174
2. You should see the Auth Page with Login/Signup tabs
3. Click "Login" tab
4. Enter: `doctor` / `doctor123`
5. Click "Login" button
6. You should see the Doctor Dashboard with:
   - Patient management panel
   - Appointment scheduler
   - Inventory management
   - Dental charting tools

---

## Development Notes

### JWT Authentication
- Login endpoint returns a JWT token
- Token is stored in localStorage as 'token'
- All API requests include: `Authorization: Bearer {token}`
- Token expires after 24 hours

### Data Flow
1. User submits login form in AuthPage
2. App calls `authAPI.login()` from src/api.js
3. API sends POST request to backend
4. Backend validates credentials against MySQL
5. Backend returns JWT token and user info
6. Frontend stores token and user in localStorage
7. Subsequent API calls automatically include token header

### Adding New Features
1. Add backend route in `backend/routes/`
2. Add API service in `src/api.js`
3. Use the service in React components
4. Token is automatically included in headers

---

## Sample Data

The database comes pre-populated with:
- 2 users (doctor, assistant)
- 3 sample patients
- 2 sample appointments
- 3 sample inventory items
- Various service prices and announcements

Feel free to delete and create your own data through the app interface.

---

## Need Help?

Check the error messages in:
1. Browser Console (F12 → Console tab)
2. Backend terminal output
3. Frontend terminal output

Common errors are logged with helpful messages to guide fixes.
