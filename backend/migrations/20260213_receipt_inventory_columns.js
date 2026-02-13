const mysql = require('mysql2/promise');
require('dotenv').config();

async function columnExists(connection, table, column) {
  const [rows] = await connection.query('SHOW COLUMNS FROM ?? LIKE ?', [table, column]);
  return rows.length > 0;
}

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dental_clinic',
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    console.log('🔧 Applying receipt inventory migration...');

    const hasAppointmentId = await columnExists(connection, 'treatmentRecords', 'appointmentId');
    if (!hasAppointmentId) {
      console.log('• Adding treatmentRecords.appointmentId column');
      await connection.query('ALTER TABLE treatmentRecords ADD COLUMN appointmentId INT NULL AFTER patientId');
    } else {
      console.log('• treatmentRecords.appointmentId already exists');
    }

    const hasSelectedServices = await columnExists(connection, 'treatmentRecords', 'selectedServices');
    if (!hasSelectedServices) {
      console.log('• Adding treatmentRecords.selectedServices column');
      await connection.query('ALTER TABLE treatmentRecords ADD COLUMN selectedServices LONGTEXT NULL');
    } else {
      console.log('• treatmentRecords.selectedServices already exists');
    }

    const hasTreatmentRecordId = await columnExists(connection, 'inventory_reduction_history', 'treatmentRecordId');
    if (!hasTreatmentRecordId) {
      console.log('• Adding inventory_reduction_history.treatmentRecordId column');
      await connection.query('ALTER TABLE inventory_reduction_history ADD COLUMN treatmentRecordId INT NULL AFTER appointmentId');
      await connection.query('ALTER TABLE inventory_reduction_history ADD INDEX idx_treatment_record (treatmentRecordId)');
      await connection.query('ALTER TABLE inventory_reduction_history ADD CONSTRAINT fk_inventory_history_treatment FOREIGN KEY (treatmentRecordId) REFERENCES treatmentRecords(id) ON DELETE SET NULL');
    } else {
      console.log('• inventory_reduction_history.treatmentRecordId already exists');
    }

    console.log('✅ Receipt inventory migration complete');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

run();
