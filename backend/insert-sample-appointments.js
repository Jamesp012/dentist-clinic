const mysql = require('mysql2/promise');
require('dotenv').config();

async function insertSampleAppointments() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'dental_clinic'
  });

  try {
    console.log('Inserting sample appointments...');

    // Check if patients exist first
    const [patients] = await connection.query('SELECT id, name FROM patients LIMIT 2');
    
    if (patients.length < 2) {
      console.log('Not enough patients. Creating sample patients first...');
      await connection.query(
        `INSERT INTO patients (name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Krista', '1985-03-15', '(555) 123-4567', 'krista@email.com', '123 Main St, City, ST 12345', 'Female', 'Diabetes Type 2', 'Penicillin']
      );
      await connection.query(
        `INSERT INTO patients (name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Sarah', '1992-07-22', '(555) 234-5678', 'sarah@email.com', '456 Oak Ave, City, ST 12345', 'Female', 'None', 'None']
      );
    }

    // Insert sample appointments with new DATETIME format
    const [result1] = await connection.query(
      `INSERT INTO appointments (patientId, patientName, appointmentDateTime, type, duration, status, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patients[0]?.id || 1, patients[0]?.name || 'Krista', '2025-02-06 10:00:00', 'Braces Adjustment', 45, 'scheduled', 'Monthly braces adjustment']
    );
    console.log(`✓ Inserted appointment 1 (ID: ${result1.insertId})`);

    const [result2] = await connection.query(
      `INSERT INTO appointments (patientId, patientName, appointmentDateTime, type, duration, status, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patients[1]?.id || 2, patients[1]?.name || 'Sarah', '2025-02-15 14:00:00', 'Root Canal', 90, 'scheduled', 'Tooth #14']
    );
    console.log(`✓ Inserted appointment 2 (ID: ${result2.insertId})`);

    // Verify the data
    const [appointments] = await connection.query('SELECT * FROM appointments ORDER BY appointmentDateTime ASC');
    console.log('\n✓ Sample appointments inserted successfully!');
    console.log('\nAppointments in database:');
    appointments.forEach(apt => {
      console.log(`  - ${apt.patientName}: ${apt.appointmentDateTime} (${apt.type})`);
    });

  } catch (error) {
    console.error('Error inserting sample data:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

insertSampleAppointments();
