#!/usr/bin/env node

const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dental_clinic',
      port: Number(process.env.DB_PORT) || 3306
    });

    console.log('Checking patient_notifications table...');

    // Check if table exists
    const [tables] = await pool.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dental_clinic' AND TABLE_NAME = 'patient_notifications'
    `);

    if (tables.length > 0) {
      console.log('✓ patient_notifications table already exists');
      pool.end();
      process.exit(0);
    }

    // Create the table
    console.log('Creating patient_notifications table...');
    
    await pool.query(`
      CREATE TABLE patient_notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        patientId INT NOT NULL,
        appointmentId INT,
        type ENUM('appointment_created', 'appointment_updated', 'appointment_cancelled', 'reminder') DEFAULT 'appointment_created',
        title VARCHAR(200),
        message TEXT,
        isRead TINYINT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        readAt TIMESTAMP NULL,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE SET NULL,
        INDEX idx_patient_read (patientId, isRead),
        INDEX idx_created (createdAt)
      )
    `);

    console.log('✓ patient_notifications table created successfully');
    pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
