const mysql = require('mysql2/promise');
const bcryptjs = require('bcryptjs');
require('dotenv').config();

async function initializeDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    // Create database (if it doesn't exist)
    // Commented out DROP to prevent accidental data loss
    // await connection.query('DROP DATABASE IF EXISTS dental_clinic');
    await connection.query('CREATE DATABASE IF NOT EXISTS dental_clinic');
    await connection.query('USE dental_clinic');

    console.log('✓ Database created');

    // Create tables
    await connection.query(`
      CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        fullName VARCHAR(100),
        email VARCHAR(100),
        phone VARCHAR(20),
        role ENUM('doctor', 'assistant', 'patient') NOT NULL,
        position ENUM('dentist', 'assistant_dentist', 'assistant') DEFAULT NULL,
        isFirstLogin BOOLEAN DEFAULT TRUE,
        accountStatus ENUM('pending', 'active', 'inactive') DEFAULT 'active',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE patients (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        name VARCHAR(100) NOT NULL,
        dateOfBirth DATE,
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        sex ENUM('Male', 'Female'),
        medicalHistory TEXT,
        allergies TEXT,
        lastVisit DATE,
        nextAppointment DATE,
        has_account BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE appointments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        patientId INT,
        patientName VARCHAR(100),
        date DATE NOT NULL,
        time TIME NOT NULL,
        type VARCHAR(100),
        duration INT,
        status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE treatmentRecords (
        id INT PRIMARY KEY AUTO_INCREMENT,
        patientId INT,
        date DATE,
        treatment VARCHAR(100),
        tooth VARCHAR(10),
        notes TEXT,
        cost DECIMAL(10, 2),
        dentist VARCHAR(100),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE inventory (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(150) NOT NULL,
        category VARCHAR(50),
        quantity INT,
        minQuantity INT,
        unit VARCHAR(20),
        supplier VARCHAR(100),
        lastOrdered DATE,
        cost DECIMAL(10, 2),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE employees (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT UNIQUE,
        name VARCHAR(100) NOT NULL,
        position ENUM('dentist', 'assistant_dentist', 'assistant') NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        dateHired DATE,
        generatedCode VARCHAR(100) UNIQUE,
        isCodeUsed BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE referrals (
        id INT PRIMARY KEY AUTO_INCREMENT,
        patientId INT,
        patientName VARCHAR(100),
        referringDentist VARCHAR(100),
        referredTo VARCHAR(100),
        specialty VARCHAR(100),
        reason TEXT,
        date DATE,
        urgency ENUM('routine', 'urgent', 'emergency'),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE photos (
        id INT PRIMARY KEY AUTO_INCREMENT,
        patientId INT,
        type ENUM('before', 'after', 'xray'),
        url TEXT,
        date DATE,
        notes TEXT,
        treatmentId INT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE chatMessages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        patientId INT,
        senderId INT,
        senderName VARCHAR(100),
        senderRole ENUM('patient', 'assistant'),
        message TEXT,
        timestamp DATETIME,
        isRead TINYINT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE announcements (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(200),
        message TEXT,
        type ENUM('promo', 'closure', 'general', 'important'),
        date DATE,
        createdBy VARCHAR(100),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE servicePrices (
        id INT PRIMARY KEY AUTO_INCREMENT,
        serviceName VARCHAR(150),
        description TEXT,
        price DECIMAL(10, 2),
        category VARCHAR(50),
        duration VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ Tables created');

    // Hash passwords properly
    const doctorHash = await bcryptjs.hash('doctor123', 10);
    const assistantHash = await bcryptjs.hash('assistant123', 10);
    const patientHash = await bcryptjs.hash('patient123', 10);

    // Insert users
    await connection.query(
      'INSERT INTO users (username, password, fullName, email, phone, role, isFirstLogin) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['doctor', doctorHash, 'Dr. Joseph Maaño', 'doctor@clinic.com', '+63-9123-456-789', 'doctor', false]
    );

    await connection.query(
      'INSERT INTO users (username, password, fullName, email, phone, role, isFirstLogin) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['assistant', assistantHash, 'Maria Santos', 'assistant@clinic.com', '+63-9187-654-321', 'assistant', false]
    );

    const [patientUser] = await connection.query(
      'INSERT INTO users (username, password, fullName, email, phone, role, isFirstLogin) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['patientdemo', patientHash, 'Jane Patient', 'patient.demo@clinic.com', '+63-9200-111-222', 'patient', false]
    );

    console.log('✓ Users created (doctor/doctor123, assistant/assistant123, patientdemo/patient123)');

    // Insert patients
    await connection.query(
      'INSERT INTO patients (name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['Krista', '1985-03-15', '+63-9123-456-789', 'krista@email.com', '123 Main St, Makati, Manila', 'Female', 'Diabetes Type 2', 'Penicillin']
    );

    await connection.query(
      'INSERT INTO patients (name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['Sarah', '1992-07-22', '+63-9198-765-432', 'sarah@email.com', '456 Oak Ave, BGC, Taguig', 'Female', 'None', 'None']
    );

    await connection.query(
      'INSERT INTO patients (name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['Susa', '1978-11-30', '+63-9156-789-012', 'susa@email.com', '789 Elm St, Quezon City', 'Female', 'Hypertension', 'Latex']
    );

    await connection.query(
      'INSERT INTO patients (user_id, name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [patientUser.insertId, 'Jane Patient', '1990-05-10', '+63-9200-111-222', 'patient.demo@clinic.com', '123 Demo St, Makati', 'Female', 'None', 'None']
    );

    console.log('✓ Sample patients created');

    // Insert appointments
    await connection.query(
      'INSERT INTO appointments (patientId, patientName, date, time, type, duration, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [1, 'Krista', '2024-12-06', '10:00:00', 'Braces Adjustment', 45, 'scheduled', 'Monthly braces adjustment']
    );

    await connection.query(
      'INSERT INTO appointments (patientId, patientName, date, time, type, duration, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [2, 'Sarah', '2024-12-15', '14:00:00', 'Root Canal', 90, 'scheduled', 'Tooth #14']
    );

    console.log('✓ Sample appointments created');

    // Insert inventory
    await connection.query(
      'INSERT INTO inventory (name, category, quantity, minQuantity, unit, supplier, cost) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Nitrile Gloves (Box)', 'PPE', 45, 20, 'box', 'MedSupply Co.', 12.99]
    );

    await connection.query(
      'INSERT INTO inventory (name, category, quantity, minQuantity, unit, supplier, cost) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Dental Anesthetic', 'Medications', 15, 25, 'vial', 'PharmaDent', 45.00]
    );

    await connection.query(
      'INSERT INTO inventory (name, category, quantity, minQuantity, unit, supplier, cost) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Composite Filling Material', 'Restorative', 8, 10, 'syringe', 'DentalCare Inc.', 78.50]
    );

    console.log('✓ Sample inventory created');

    // Insert service prices
    await connection.query(
      'INSERT INTO servicePrices (serviceName, description, price, category, duration) VALUES (?, ?, ?, ?, ?)',
      ['Teeth Cleaning', 'Professional dental cleaning and polishing', 1500, 'Preventive', '45 minutes']
    );

    await connection.query(
      'INSERT INTO servicePrices (serviceName, description, price, category, duration) VALUES (?, ?, ?, ?, ?)',
      ['Tooth Extraction', 'Simple tooth extraction (includes anesthesia)', 2000, 'Surgery', '30 minutes']
    );

    await connection.query(
      'INSERT INTO servicePrices (serviceName, description, price, category, duration) VALUES (?, ?, ?, ?, ?)',
      ['Filling', 'Dental filling for cavities', 1800, 'Restorative', '60 minutes']
    );

    await connection.query(
      'INSERT INTO servicePrices (serviceName, description, price, category, duration) VALUES (?, ?, ?, ?, ?)',
      ['Braces Installation', 'Complete braces installation (upper and lower)', 35000, 'Orthodontics', '2 hours']
    );

    await connection.query(
      'INSERT INTO servicePrices (serviceName, description, price, category, duration) VALUES (?, ?, ?, ?, ?)',
      ['Braces Adjustment', 'Monthly braces tightening and maintenance', 500, 'Orthodontics', '30 minutes']
    );

    console.log('✓ Service prices created');

    // Insert announcements
    await connection.query(
      'INSERT INTO announcements (title, message, type, date, createdBy) VALUES (?, ?, ?, ?, ?)',
      ['New Equipment', 'We have installed new digital imaging equipment', 'general', new Date().toISOString().split('T')[0], 'Dr. Joseph Maaño']
    );

    console.log('✓ Database initialized successfully!');

  } catch (error) {
    console.error('Error initializing database:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

initializeDatabase();
