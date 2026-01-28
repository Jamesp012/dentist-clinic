const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const patientsRoutes = require('./routes/patients');
const appointmentsRoutes = require('./routes/appointments');
const inventoryRoutes = require('./routes/inventory');
const referralsRoutes = require('./routes/referrals');
const employeesRoutes = require('./routes/employees');
const treatmentRecordsRoutes = require('./routes/treatmentRecords');
const paymentsRoutes = require('./routes/payments');
const patientClaimingRoutes = require('./routes/patient-claiming');
const announcementsRoutes = require('./routes/announcements');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check - no database required
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Routes - These will connect to database when first request comes in
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/referrals', referralsRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/treatment-records', treatmentRecordsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/patient-claiming', patientClaimingRoutes);
app.use('/api/announcements', announcementsRoutes);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
