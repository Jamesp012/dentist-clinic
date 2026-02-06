#!/usr/bin/env node

/**
 * Initialize Announcement Notifications Feature
 * 
 * Run this once after updating the backend code:
 * $ node backend/init-announcement-notifications.js
 * 
 * This script:
 * 1. Ensures patient_notifications table exists
 * 2. Updates ENUM type to include 'announcement_posted'
 * 3. Verifies database connectivity
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function initializeNotifications() {
  let pool;
  
  try {
    console.log('🔧 Initializing Announcement Notifications System...\n');
    
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dental_clinic',
      port: Number(process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test connection
    console.log('📡 Testing database connection...');
    const connection = await pool.getConnection();
    connection.release();
    console.log('✓ Database connection successful\n');

    const dbName = process.env.DB_NAME || 'dental_clinic';

    // Step 1: Check if patient_notifications table exists
    console.log('📋 Checking patient_notifications table...');
    const [existingTables] = await pool.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'patient_notifications'
    `, [dbName]);

    if (existingTables.length === 0) {
      console.log('   Creating patient_notifications table...');
      
      await pool.query(`
        CREATE TABLE patient_notifications (
          id INT PRIMARY KEY AUTO_INCREMENT,
          patientId INT NOT NULL,
          appointmentId INT,
          type ENUM(
            'appointment_created',
            'appointment_updated', 
            'appointment_cancelled',
            'reminder',
            'announcement_posted'
          ) DEFAULT 'appointment_created',
          title VARCHAR(255) CHARACTER SET utf8mb4,
          message LONGTEXT CHARACTER SET utf8mb4,
          isRead BOOLEAN DEFAULT FALSE,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          readAt TIMESTAMP NULL,
          FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
          FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE SET NULL,
          INDEX idx_patient_read (patientId, isRead),
          INDEX idx_created (createdAt),
          INDEX idx_type (type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('   ✓ patient_notifications table created\n');
    } else {
      console.log('   ✓ patient_notifications table exists');
      
      // Step 2: Check ENUM type
      console.log('   Checking ENUM type...');
      const [columns] = await pool.query(`
        SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'patient_notifications' AND COLUMN_NAME = 'type'
      `, [dbName]);

      if (columns.length > 0) {
        const columnType = columns[0].COLUMN_TYPE;
        
        if (!columnType.includes('announcement_posted')) {
          console.log('   Updating ENUM to include announcement_posted...');
          
          try {
            await pool.query(`
              ALTER TABLE patient_notifications 
              MODIFY COLUMN type ENUM(
                'appointment_created',
                'appointment_updated',
                'appointment_cancelled',
                'reminder',
                'announcement_posted'
              ) DEFAULT 'appointment_created'
            `);
            
            console.log('   ✓ ENUM type updated\n');
          } catch (enumErr) {
            console.log('   ⚠ Could not update ENUM (may already be updated)');
            console.log(`   Current type: ${columnType}\n`);
          }
        } else {
          console.log('   ✓ ENUM type already includes announcement_posted\n');
        }
      }
    }

    // Step 3: Verify data integrity
    console.log('📊 Verifying data...');
    const [patientCount] = await pool.query('SELECT COUNT(*) as count FROM patients');
    const [notificationCount] = await pool.query('SELECT COUNT(*) as count FROM patient_notifications');
    
    console.log(`   ✓ Patients in system: ${patientCount[0].count}`);
    console.log(`   ✓ Existing notifications: ${notificationCount[0].count}\n`);

    // Step 4: Test notification creation
    console.log('🧪 Testing notification creation...');
    
    if (patientCount[0].count > 0) {
      const testTitle = `Test Notification - ${new Date().toISOString()}`;
      const testMessage = 'This is a test notification to verify the system is working';
      
      try {
        await pool.query(`
          INSERT INTO patient_notifications (patientId, type, title, message)
          SELECT id, 'announcement_posted', ?, ? FROM patients LIMIT 1
        `, [testTitle, testMessage]);
        
        console.log('   ✓ Test notification created successfully');
        console.log('   (Note: You can verify in patient portal)\n');
      } catch (testErr) {
        console.log(`   ⚠ Test notification creation failed: ${testErr.message}\n`);
      }
    } else {
      console.log('   ⚠ No patients in system. Create a patient first to test.\n');
    }

    console.log('✅ Initialization complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Create an announcement as doctor/assistant');
    console.log('   3. Login as patient and check for notification');
    console.log('   4. Click notification to navigate to announcements\n');

    pool.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('- Make sure MySQL is running');
    console.error('- Check your .env file for correct DB credentials');
    console.error('- Verify the database exists:', process.env.DB_NAME || 'dental_clinic');
    
    if (pool) pool.end();
    process.exit(1);
  }
}

// Run initialization
initializeNotifications();
