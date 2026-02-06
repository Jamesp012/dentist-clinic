#!/usr/bin/env node

const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  let pool;
  try {
    pool = mysql.createPool({
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
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'dental_clinic'}' AND TABLE_NAME = 'patient_notifications'
    `);

    if (tables.length === 0) {
      console.log('Creating patient_notifications table...');
      
      await pool.query(`
        CREATE TABLE patient_notifications (
          id INT PRIMARY KEY AUTO_INCREMENT,
          patientId INT NOT NULL,
          appointmentId INT,
          type ENUM('appointment_created', 'appointment_updated', 'appointment_cancelled', 'reminder', 'announcement_posted') DEFAULT 'appointment_created',
          title VARCHAR(200) CHARACTER SET utf8mb4,
          message TEXT CHARACTER SET utf8mb4,
          isRead BOOLEAN DEFAULT FALSE,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          readAt TIMESTAMP NULL,
          FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
          FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE SET NULL,
          INDEX idx_patient_read (patientId, isRead),
          INDEX idx_created (createdAt)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log('✓ patient_notifications table created successfully');
    } else {
      console.log('✓ patient_notifications table exists');
      
      // Check if the ENUM type includes announcement_posted
      const [columns] = await pool.query(`
        SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'dental_clinic'}'
        AND TABLE_NAME = 'patient_notifications' 
        AND COLUMN_NAME = 'type'
      `);
      
      if (columns.length > 0) {
        const columnType = columns[0].COLUMN_TYPE;
        console.log('Current ENUM type:', columnType);
        
        if (!columnType.includes('announcement_posted')) {
          console.log('Updating ENUM type to include announcement_posted...');
          
          await pool.query(`
            ALTER TABLE patient_notifications 
            MODIFY COLUMN type ENUM('appointment_created', 'appointment_updated', 'appointment_cancelled', 'reminder', 'announcement_posted') DEFAULT 'appointment_created'
          `);
          console.log('✓ ENUM type updated successfully');
        } else {
          console.log('✓ ENUM type already includes announcement_posted');
        }
      }
    }
    
    // Verify the table is accessible
    const [testQuery] = await pool.query('SELECT COUNT(*) as count FROM patient_notifications');
    console.log(`✓ patient_notifications table is accessible (${testQuery[0].count} records)`);
    
    console.log('\n✓ Database schema verification complete!');
    pool.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    if (pool) pool.end();
    process.exit(1);
  }
})();
