const mysql = require('mysql2/promise');
const bcryptjs = require('bcryptjs');
require('dotenv').config();

async function setupTestData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'dental_clinic'
  });

  try {
    console.log('Setting up test data...\n');

    // Create users first
    const doctorHash = await bcryptjs.hash('doctor123', 10);
    const assistantHash = await bcryptjs.hash('assistant123', 10);

    console.log('Creating users...');
    const [doctorUserResult] = await connection.execute(
      'INSERT IGNORE INTO users (username, password, fullName, email, phone, role, position, isFirstLogin, accountStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['doctor', doctorHash, 'Dr. Joseph Maaño', 'doctor@clinic.com', '+63-9123-456-789', 'doctor', 'dentist', false, 'active']
    );
    console.log('✓ Doctor user created');

    const [assistantUserResult] = await connection.execute(
      'INSERT IGNORE INTO users (username, password, fullName, email, phone, role, position, isFirstLogin, accountStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['assistant', assistantHash, 'Maria Santos', 'assistant@clinic.com', '+63-9187-654-321', 'assistant', 'assistant', false, 'active']
    );
    console.log('✓ Assistant user created');

    // Create patients
    console.log('\nCreating patients...');
    const [patient1Result] = await connection.execute(
      'INSERT IGNORE INTO patients (name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['Krista', '1985-03-15', '(555) 123-4567', 'krista@email.com', '123 Main St, City, ST 12345', 'Female', 'Diabetes Type 2', 'Penicillin']
    );
    const patient1Id = patient1Result.insertId || 1;
    console.log(`✓ Patient 1 created (ID: ${patient1Id})`);

    const [patient2Result] = await connection.execute(
      'INSERT IGNORE INTO patients (name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['Sarah', '1992-07-22', '(555) 234-5678', 'sarah@email.com', '456 Oak Ave, City, ST 12345', 'Female', 'None', 'None']
    );
    const patient2Id = patient2Result.insertId || 2;
    console.log(`✓ Patient 2 created (ID: ${patient2Id})`);

    // Create appointments with new DATETIME format
    console.log('\nCreating appointments...');
    const [apt1Result] = await connection.execute(
      `INSERT INTO appointments (patientId, patientName, appointmentDateTime, type, duration, status, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patient1Id, 'Krista', '2025-02-06 10:00:00', 'Braces Adjustment', 45, 'scheduled', 'Monthly braces adjustment']
    );
    console.log(`✓ Appointment 1 created (ID: ${apt1Result.insertId})`);

    const [apt2Result] = await connection.execute(
      `INSERT INTO appointments (patientId, patientName, appointmentDateTime, type, duration, status, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patient2Id, 'Sarah', '2025-02-15 14:00:00', 'Root Canal', 90, 'scheduled', 'Tooth #14']
    );
    console.log(`✓ Appointment 2 created (ID: ${apt2Result.insertId})`);

    // Add upcoming appointment for today/tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    
    const [apt3Result] = await connection.execute(
      `INSERT INTO appointments (patientId, patientName, appointmentDateTime, type, duration, status, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patient1Id, 'Krista', `${tomorrowDate} 09:00:00`, 'Regular Checkup', 30, 'scheduled', 'Follow-up visit']
    );
    console.log(`✓ Appointment 3 created (ID: ${apt3Result.insertId}) - Tomorrow at 9:00 AM`);

    // Verify all appointments
    console.log('\nVerifying appointments...');
    const [appointments] = await connection.query('SELECT * FROM appointments ORDER BY appointmentDateTime ASC');
    console.log(`\n✓ Total appointments: ${appointments.length}`);
    appointments.forEach(apt => {
      console.log(`  - ID: ${apt.id} | ${apt.patientName} | ${apt.appointmentDateTime} | ${apt.type} | ${apt.status}`);
    });

    console.log('\n✓ Setup completed successfully!');
    console.log('\nTest Credentials:');
    console.log('  Doctor: doctor / doctor123');
    console.log('  Assistant: assistant / assistant123');

  } catch (error) {
    console.error('Error setting up test data:', error.message);
    if (error.message.includes('Duplicate entry')) {
      console.log('\nNote: Some data already exists in the database. Continuing with available data.');
    } else {
      process.exit(1);
    }
  } finally {
    await connection.end();
  }
}

setupTestData();
