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
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.execute(`
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
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
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

    await connection.execute(`
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

    await connection.execute(`
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

    await connection.execute(`
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

    await connection.execute(`
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

    await connection.execute(`
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

    await connection.execute(`
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

    await connection.execute(`
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

    // Create doctor user account (already activated, not first login)
    const [doctorUserResult] = await connection.execute(
      'INSERT INTO users (username, password, fullName, email, phone, role, position, isFirstLogin, accountStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['doctor', doctorHash, 'Dr. Joseph Maaño', 'doctor@clinic.com', '+63-9123-456-789', 'doctor', 'dentist', false, 'active']
    );

    // Create doctor employee record linked to user
    await connection.execute(
      'INSERT INTO employees (user_id, name, position, phone, email, address, dateHired, isCodeUsed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [doctorUserResult.insertId, 'Dr. Joseph Maaño', 'dentist', '+63-9123-456-789', 'doctor@clinic.com', '123 Medical Plaza, Makati City', '2020-01-15', true]
    );

    // Create assistant user account (already activated, not first login)
    const [assistantUserResult] = await connection.execute(
      'INSERT INTO users (username, password, fullName, email, phone, role, position, isFirstLogin, accountStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['assistant', assistantHash, 'Maria Santos', 'assistant@clinic.com', '+63-9187-654-321', 'assistant', 'assistant', false, 'active']
    );

    // Create assistant employee record linked to user
    await connection.execute(
      'INSERT INTO employees (user_id, name, position, phone, email, address, dateHired, isCodeUsed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [assistantUserResult.insertId, 'Maria Santos', 'assistant', '+63-9187-654-321', 'assistant@clinic.com', '456 Santos Street, Quezon City', '2021-03-20', true]
    );

    console.log('✓ Employees created with user accounts');
    console.log('  Doctor: doctor / doctor123 (Dr. Joseph Maaño)');
    console.log('  Assistant: assistant / assistant123 (Maria Santos)');

    // Insert patients
    await connection.execute(
      'INSERT INTO patients (name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['Krista', '1985-03-15', '(555) 123-4567', 'krista@email.com', '123 Main St, City, ST 12345', 'Female', 'Diabetes Type 2', 'Penicillin']
    );

    await connection.execute(
      'INSERT INTO patients (name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['Sarah', '1992-07-22', '(555) 234-5678', 'sarah@email.com', '456 Oak Ave, City, ST 12345', 'Female', 'None', 'None']
    );

    await connection.execute(
      'INSERT INTO patients (name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['Susa', '1978-11-30', '(555) 345-6789', 'susa@email.com', '789 Elm St, City, ST 12345', 'Female', 'Hypertension', 'Latex']
    );

    console.log('✓ Sample patients created');

    // Insert appointments
    await connection.execute(
      'INSERT INTO appointments (patientId, patientName, date, time, type, duration, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [1, 'Krista', '2024-12-06', '10:00:00', 'Braces Adjustment', 45, 'scheduled', 'Monthly braces adjustment']
    );

    await connection.execute(
      'INSERT INTO appointments (patientId, patientName, date, time, type, duration, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [2, 'Sarah', '2024-12-15', '14:00:00', 'Root Canal', 90, 'scheduled', 'Tooth #14']
    );

    console.log('✓ Sample appointments created');

    // Insert inventory
    await connection.execute(
      'INSERT INTO inventory (name, category, quantity, minQuantity, unit, supplier, cost) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Nitrile Gloves (Box)', 'PPE', 45, 20, 'box', 'MedSupply Co.', 12.99]
    );

    await connection.execute(
      'INSERT INTO inventory (name, category, quantity, minQuantity, unit, supplier, cost) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Dental Anesthetic', 'Medications', 15, 25, 'vial', 'PharmaDent', 45.00]
    );

    await connection.execute(
      'INSERT INTO inventory (name, category, quantity, minQuantity, unit, supplier, cost) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Composite Filling Material', 'Restorative', 8, 10, 'syringe', 'DentalCare Inc.', 78.50]
    );

    console.log('✓ Sample inventory created');

    // Insert service prices
    await connection.execute(
      'INSERT INTO servicePrices (serviceName, description, price, category, duration) VALUES (?, ?, ?, ?, ?)',
      ['Teeth Cleaning', 'Professional dental cleaning and polishing', 1500, 'Preventive', '45 minutes']
    );

    await connection.execute(
      'INSERT INTO servicePrices (serviceName, description, price, category, duration) VALUES (?, ?, ?, ?, ?)',
      ['Tooth Extraction', 'Simple tooth extraction (includes anesthesia)', 2000, 'Surgery', '30 minutes']
    );

    await connection.execute(
      'INSERT INTO servicePrices (serviceName, description, price, category, duration) VALUES (?, ?, ?, ?, ?)',
      ['Filling', 'Dental filling for cavities', 1800, 'Restorative', '60 minutes']
    );

    await connection.execute(
      'INSERT INTO servicePrices (serviceName, description, price, category, duration) VALUES (?, ?, ?, ?, ?)',
      ['Braces Installation', 'Complete braces installation (upper and lower)', 35000, 'Orthodontics', '2 hours']
    );

    await connection.execute(
      'INSERT INTO servicePrices (serviceName, description, price, category, duration) VALUES (?, ?, ?, ?, ?)',
      ['Braces Adjustment', 'Monthly braces tightening and maintenance', 500, 'Orthodontics', '30 minutes']
    );

    console.log('✓ Service prices created');

    // Insert announcements
    await connection.execute(
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
