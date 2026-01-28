const pool = require('./config/database');

async function checkData() {
  try {
    console.log('Checking database for patient data...\n');
    
    // Check patients
    const [patients] = await pool.query('SELECT COUNT(*) as count FROM patients');
    console.log('Patients:', patients[0].count);
    
    if (patients[0].count > 0) {
      const [patientsList] = await pool.query('SELECT id, name, email FROM patients LIMIT 5');
      console.log('Sample patients:', patientsList);
    }
    
    // Check appointments
    const [appointments] = await pool.query('SELECT COUNT(*) as count FROM appointments');
    console.log('\nAppointments:', appointments[0].count);
    
    // Check treatment records
    const [records] = await pool.query('SELECT COUNT(*) as count FROM treatmentRecords');
    console.log('Treatment records:', records[0].count);
    
    if (records[0].count > 0) {
      const [recordsList] = await pool.query('SELECT id, patientId, description FROM treatmentRecords LIMIT 5');
      console.log('Sample treatment records:', recordsList);
    }
    
    // Check users
    const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log('\nUsers:', users[0].count);
    
    // Check photos
    const [photos] = await pool.query('SELECT COUNT(*) as count FROM photos');
    console.log('Photos:', photos[0].count);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkData();
