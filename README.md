# Dental Management System

A comprehensive dental clinic management system built with React, TypeScript, and Vite.

## Features

- **Multi-role Authentication**: Doctor, Assistant, and Patient portals
- **Patient Record Claiming**: Secure linking of existing records to new accounts ✨ NEW
- **Patient Management**: Complete patient records and history
- **Appointment Scheduling**: Calendar-based appointment management
- **Inventory Management**: Track dental supplies and equipment
- **Dental Charting**: Visual dental charting for treatments
- **Financial Reports**: Revenue and expense tracking
- **Patient Portal**: Self-service for patients
- **Real-time Chat**: Communication between patients and staff
- **Announcements**: Clinic-wide announcements and promotions

## ✨ New: Patient Record Claiming System

Patients with existing manual records (2025–present) can now securely claim their records during signup through SMS OTP verification. This feature:

- 🔍 Searches for existing patient records
- 📱 Sends OTP verification to registered phone
- 🔐 Securely links accounts after verification
- 📊 Preserves all historical records
- ✅ Prevents duplicate account linking

**Documentation:**
- [Implementation Guide](PATIENT_CLAIMING_IMPLEMENTATION.md) - Full technical documentation
- [Quick Start Guide](PATIENT_CLAIMING_QUICK_START.md) - Setup and testing
- [Flow Diagrams](PATIENT_CLAIMING_FLOW_DIAGRAM.md) - Visual workflows
- [Debug Guide](PATIENT_CLAIMING_DEBUG.md) - Troubleshooting reference

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MySQL/MariaDB database
- XAMPP (recommended for Windows)

### Installation

1. Clone the repository

2. **Database Setup:**
   ```bash
   # Start MySQL (if using XAMPP)
   # Then run the migration
   cd backend
   mysql -u root -p dental_clinic < migrate-patient-claiming.sql
   ```

3. **Backend Setup:**
   ```bash
   cd backend
   npm install
   npm start
   ```

4. **Frontend Setup:**
   ```bash
   npm install
   npm run dev
   ```

5. Open your browser to `http://localhost:5173`

### Demo Accounts

- **Doctor**: username: `doctor`, password: `doctor123`
- **Assistant**: username: `assistant`, password: `assistant123`
- **Patient**: username: `krista`, password: `patient123`

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── AuthPage.tsx    # Authentication component
│   ├── Dashboard.tsx   # Main dashboard
│   └── ...             # Other feature components
├── styles/
│   └── globals.css     # Global styles and Tailwind CSS
├── App.tsx             # Main application component
└── main.tsx           # Application entry point
```

## Technologies Used

- **React 18** - Frontend framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling framework
- **Lucide React** - Icons
- **Recharts** - Data visualization
- **Sonner** - Toast notifications
- **Motion** - Animation library

## Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## License

This project is for educational purposes.