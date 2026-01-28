const pool = require('./config/database');

async function seedFinancialData() {
  try {
    console.log('Seeding financial data...');

    // Get patients
    const [patients] = await pool.query('SELECT id FROM patients LIMIT 2');
    if (patients.length === 0) {
      console.log('No patients found. Please run create_test_users.js first.');
      process.exit(1);
    }

    const patient1Id = patients[0].id;
    const patient2Id = patients[1] ? patients[1].id : patient1Id;

    // Clear existing records for these patients to avoid duplicates if re-run
    await pool.query('DELETE FROM payments WHERE patientId IN (?, ?)', [patient1Id, patient2Id]);
    await pool.query('DELETE FROM treatmentRecords WHERE patientId IN (?, ?)', [patient1Id, patient2Id]);

    // Insert treatment records
    const treatments = [
      {
        patientId: patient1Id,
        date: new Date().toISOString().split('T')[0],
        treatment: 'Dental Cleaning',
        cost: 1500,
        dentist: 'Dr. Smith',
        amountPaid: 1500,
        remainingBalance: 0
      },
      {
        patientId: patient1Id,
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        treatment: 'Tooth Extraction',
        cost: 2500,
        dentist: 'Dr. Smith',
        amountPaid: 1000,
        remainingBalance: 1500
      },
      {
        patientId: patient2Id,
        date: new Date().toISOString().split('T')[0],
        treatment: 'Root Canal',
        cost: 8000,
        dentist: 'Dr. Jones',
        amountPaid: 4000,
        remainingBalance: 4000
      }
    ];

    for (const t of treatments) {
      const [result] = await pool.query(
        'INSERT INTO treatmentRecords (patientId, date, treatment, cost, dentist, amountPaid, remainingBalance) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [t.patientId, t.date, t.treatment, t.cost, t.dentist, t.amountPaid, t.remainingBalance]
      );
      
      const recordId = result.insertId;

      // Add payment record for the amount paid
      if (t.amountPaid > 0) {
        await pool.query(
          'INSERT INTO payments (patientId, treatmentRecordId, amount, paymentDate, paymentMethod, status, recordedBy) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [t.patientId, recordId, t.amountPaid, t.date, 'cash', 'paid', 'System Admin']
        );
      }
    }

    console.log('Financial data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding financial data:', error);
    process.exit(1);
  }
}

seedFinancialData();
