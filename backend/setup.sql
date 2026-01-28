DROP DATABASE IF EXISTS dental_clinic;
CREATE DATABASE dental_clinic;
USE dental_clinic;

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  fullName VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  role ENUM('doctor', 'assistant', 'patient') NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
);

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
);

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
);

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
);

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
);

CREATE TABLE photos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patientId INT,
  type ENUM('before', 'after', 'xray'),
  url TEXT,
  date DATE,
  notes TEXT,
  treatmentId INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
);

CREATE TABLE announcements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200),
  message TEXT,
  type ENUM('promo', 'closure', 'general', 'important'),
  date DATE,
  createdBy VARCHAR(100),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE servicePrices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  serviceName VARCHAR(150),
  description TEXT,
  price DECIMAL(10, 2),
  category VARCHAR(50),
  duration VARCHAR(50),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, password, fullName, email, phone, role) VALUES
('doctor', '$2a$10$yyydaL5RS7Y9crlnsipSY.MI1BT2FwF1ENXDTqGgX.uOwse1afmk.', 'Dr. Joseph Maaño', 'doctor@clinic.com', '555-1234', 'doctor'),
('assistant', '$2a$10$8PXU2eT5Mrnqa3NWcB45rugTb3eTdLljHXQJ7NW.98RC1bqkB9D4e', 'Maria Santos', 'assistant@clinic.com', '555-5678', 'assistant');

INSERT INTO patients (name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies) VALUES
('Krista', '1985-03-15', '(555) 123-4567', 'krista@email.com', '123 Main St, City, ST 12345', 'Female', 'Diabetes Type 2', 'Penicillin'),
('Sarah', '1992-07-22', '(555) 234-5678', 'sarah@email.com', '456 Oak Ave, City, ST 12345', 'Female', 'None', 'None'),
('Susa', '1978-11-30', '(555) 345-6789', 'susa@email.com', '789 Elm St, City, ST 12345', 'Female', 'Hypertension', 'Latex');

INSERT INTO appointments (patientId, patientName, date, time, type, duration, status, notes) VALUES
(1, 'Krista', '2024-12-06', '10:00:00', 'Braces Adjustment', 45, 'scheduled', 'Monthly braces adjustment'),
(2, 'Sarah', '2024-12-15', '14:00:00', 'Root Canal', 90, 'scheduled', 'Tooth #14');

INSERT INTO inventory (name, category, quantity, minQuantity, unit, supplier, cost) VALUES
('Nitrile Gloves (Box)', 'PPE', 45, 20, 'box', 'MedSupply Co.', 12.99),
('Dental Anesthetic', 'Medications', 15, 25, 'vial', 'PharmaDent', 45.00),
('Composite Filling Material', 'Restorative', 8, 10, 'syringe', 'DentalCare Inc.', 78.50);

INSERT INTO servicePrices (serviceName, description, price, category, duration) VALUES
('Teeth Cleaning', 'Professional dental cleaning and polishing', 1500, 'Preventive', '45 minutes'),
('Tooth Extraction', 'Simple tooth extraction (includes anesthesia)', 2000, 'Surgery', '30 minutes'),
('Pasta (Filling)', 'Dental filling for cavities', 1800, 'Restorative', '60 minutes'),
('Braces Installation', 'Complete braces installation (upper and lower)', 35000, 'Orthodontics', '2 hours'),
('Braces Adjustment', 'Monthly braces tightening and maintenance', 500, 'Orthodontics', '30 minutes');
