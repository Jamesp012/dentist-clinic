-- Create database
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
CREATE DATABASE IF NOT EXISTS dental_clinic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dental_clinic;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  fullName VARCHAR(100) CHARACTER SET utf8mb4,
  email VARCHAR(100),
  phone VARCHAR(20),
  role ENUM('doctor', 'assistant', 'patient') NOT NULL,
  position ENUM('dentist', 'assistant_dentist', 'assistant') DEFAULT NULL,
  accessLevel ENUM('Admin', 'Super Admin', 'Default Accounts') DEFAULT 'Default Accounts',
  isFirstLogin BOOLEAN DEFAULT TRUE,
  accountStatus ENUM('pending', 'active', 'inactive') DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE,
  name VARCHAR(100) NOT NULL CHARACTER SET utf8mb4,
  position ENUM('dentist', 'assistant_dentist', 'assistant') NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT CHARACTER SET utf8mb4,
  dateOfBirth DATE,
  dateHired DATE,
  generatedCode VARCHAR(100) UNIQUE,
  isCodeUsed BOOLEAN DEFAULT FALSE,
  accessLevel ENUM('Admin', 'Super Admin', 'Default Accounts') DEFAULT 'Default Accounts',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  name VARCHAR(100) NOT NULL CHARACTER SET utf8mb4,
  dateOfBirth DATE,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT CHARACTER SET utf8mb4,
  sex ENUM('Male', 'Female'),
  medicalHistory TEXT CHARACTER SET utf8mb4,
  allergies TEXT CHARACTER SET utf8mb4,
  lastVisit DATE,
  nextAppointment DATE,
  totalBalance DECIMAL(10, 2) DEFAULT 0,
  has_account BOOLEAN DEFAULT FALSE,
  profilePhoto LONGTEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patientId INT NOT NULL,
  patientName VARCHAR(100) CHARACTER SET utf8mb4,
  appointmentDateTime DATETIME NOT NULL,
  type VARCHAR(100) CHARACTER SET utf8mb4,
  duration INT DEFAULT 60,
  status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
  notes TEXT CHARACTER SET utf8mb4,
  createdByRole ENUM('patient', 'staff') DEFAULT 'staff',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
  INDEX idx_patient_date (patientId, appointmentDateTime),
  INDEX idx_status (status)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Treatment records table
CREATE TABLE IF NOT EXISTS treatmentRecords (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patientId INT,
  date DATE,
  treatment VARCHAR(100) CHARACTER SET utf8mb4,
  tooth VARCHAR(10),
  notes TEXT CHARACTER SET utf8mb4,
  cost DECIMAL(10, 2),
  dentist VARCHAR(100) CHARACTER SET utf8mb4,
  paymentType ENUM('full', 'installment') DEFAULT 'full',
  amountPaid DECIMAL(10, 2) DEFAULT 0,
  remainingBalance DECIMAL(10, 2) DEFAULT 0,
  installmentPlan JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL CHARACTER SET utf8mb4,
  category VARCHAR(50) CHARACTER SET utf8mb4,
  quantity INT,
  minQuantity INT,
  unit VARCHAR(20),
  unit_type ENUM('box', 'piece') NOT NULL DEFAULT 'piece',
  pieces_per_box INT DEFAULT NULL,
  remaining_pieces INT DEFAULT NULL,
  supplier VARCHAR(100) CHARACTER SET utf8mb4,
  lastOrdered DATE,
  cost DECIMAL(10, 2),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patientId INT,
  patientName VARCHAR(100) CHARACTER SET utf8mb4,
  referringDentist VARCHAR(100) CHARACTER SET utf8mb4,
  referredByContact VARCHAR(50) CHARACTER SET utf8mb4 NULL,
  referredByEmail VARCHAR(120) CHARACTER SET utf8mb4 NULL,
  referredTo VARCHAR(100) CHARACTER SET utf8mb4,
  specialty VARCHAR(100) CHARACTER SET utf8mb4 NULL,
  reason TEXT CHARACTER SET utf8mb4 NULL,
  selectedServices JSON NULL,
  date DATE,
  urgency ENUM('routine', 'urgent', 'emergency') DEFAULT 'routine',
  createdByRole ENUM('patient', 'staff') DEFAULT 'staff',
  referralType ENUM('incoming', 'outgoing') DEFAULT 'outgoing',
  source ENUM('patient-uploaded', 'staff-upload', 'external') DEFAULT 'staff-upload',
  xrayDiagramSelections JSON NULL,
  xrayNotes TEXT CHARACTER SET utf8mb4 NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Referral files table
CREATE TABLE IF NOT EXISTS referral_files (
  id INT PRIMARY KEY AUTO_INCREMENT,
  referralId INT,
  patientId INT,
  fileName VARCHAR(255) NOT NULL,
  fileType ENUM('image', 'pdf', 'document') NOT NULL,
  filePath VARCHAR(500) NOT NULL,
  fileSize INT,
  url VARCHAR(500) DEFAULT NULL,
  uploadedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploadedBy INT,
  FOREIGN KEY (referralId) REFERENCES referrals(id) ON DELETE CASCADE,
  FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (uploadedBy) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_patient_date (patientId, uploadedDate)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patientId INT,
  type ENUM('before', 'after', 'xray'),
  url TEXT,
  date DATE,
  notes TEXT CHARACTER SET utf8mb4,
  treatmentId INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Chat messages table
CREATE TABLE IF NOT EXISTS chatMessages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patientId INT,
  senderId INT,
  senderName VARCHAR(100) CHARACTER SET utf8mb4,
  senderRole ENUM('patient', 'assistant'),
  message TEXT CHARACTER SET utf8mb4,
  timestamp DATETIME,
  read BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patientId INT NOT NULL,
  treatmentRecordId INT,
  amount DECIMAL(10, 2) NOT NULL,
  paymentDate DATE NOT NULL,
  paymentMethod ENUM('cash', 'card', 'check', 'bank_transfer') NOT NULL,
  status ENUM('paid', 'pending', 'overdue') DEFAULT 'pending',
  notes TEXT CHARACTER SET utf8mb4,
  recordedBy VARCHAR(100) CHARACTER SET utf8mb4,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (treatmentRecordId) REFERENCES treatmentRecords(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patientId INT NOT NULL,
  patientName VARCHAR(100) CHARACTER SET utf8mb4,
  dentist VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL,
  licenseNumber VARCHAR(50),
  ptrNumber VARCHAR(50),
  medications JSON NOT NULL,
  notes TEXT CHARACTER SET utf8mb4,
  date DATE NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
  INDEX idx_patient_id (patientId),
  INDEX idx_created_date (createdAt),
  INDEX idx_patient_date (patientId, createdAt)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) CHARACTER SET utf8mb4,
  message TEXT CHARACTER SET utf8mb4,
  type ENUM('promo', 'closure', 'general', 'important'),
  date DATE,
  createdBy VARCHAR(100) CHARACTER SET utf8mb4,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Service prices table
CREATE TABLE IF NOT EXISTS servicePrices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  serviceName VARCHAR(150) CHARACTER SET utf8mb4,
  description TEXT CHARACTER SET utf8mb4,
  price DECIMAL(10, 2),
  category VARCHAR(50) CHARACTER SET utf8mb4,
  duration VARCHAR(50) CHARACTER SET utf8mb4,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert sample users
INSERT INTO users (username, password, fullName, email, phone, role) VALUES
('doctor', '$2a$10$9qLKMNVzc0Lc5vvWBZwJHeIw.m8dMCMT7f9dJDyQFv3KVJcbVrISy', 'Dr. Joseph Maaño', 'doctor@clinic.com', '555-1234', 'doctor'),
('assistant', '$2a$10$9qLKMNVzc0Lc5vvWBZwJHeIw.m8dMCMT7f9dJDyQFv3KVJcbVrISy', 'Maria Santos', 'assistant@clinic.com', '555-5678', 'assistant');

-- Insert sample patients
INSERT INTO patients (name, dateOfBirth, phone, email, address, sex, medicalHistory, allergies) VALUES
('Krista', '1985-03-15', '(555) 123-4567', 'krista@email.com', '123 Main St, City, ST 12345', 'Female', 'Diabetes Type 2', 'Penicillin'),
('Sarah', '1992-07-22', '(555) 234-5678', 'sarah@email.com', '456 Oak Ave, City, ST 12345', 'Female', 'None', 'None'),
('Ma''am Susa', '1978-11-30', '(555) 345-6789', 'susa@email.com', '789 Elm St, City, ST 12345', 'Female', 'Hypertension', 'Latex');

-- OTP Verification table for patient record claiming
CREATE TABLE IF NOT EXISTS otp_verifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(20) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  patientId INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
  INDEX idx_phone_otp (phone, otp),
  INDEX idx_expires (expiresAt)
);

-- Patient notifications table for appointment notifications
CREATE TABLE IF NOT EXISTS patient_notifications (
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
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Inventory Auto-Reduction Rules table
CREATE TABLE IF NOT EXISTS inventory_auto_reduction_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  appointmentType VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL,
  inventoryItemId INT NOT NULL,
  quantityToReduce INT NOT NULL DEFAULT 1,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (inventoryItemId) REFERENCES inventory(id) ON DELETE CASCADE,
  INDEX idx_appointment_type (appointmentType),
  INDEX idx_item_id (inventoryItemId),
  UNIQUE KEY uk_type_item (appointmentType, inventoryItemId)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Inventory Reduction History table
CREATE TABLE IF NOT EXISTS inventory_reduction_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  appointmentId INT NOT NULL,
  patientId INT NOT NULL,
  patientName VARCHAR(100) CHARACTER SET utf8mb4,
  appointmentType VARCHAR(100) CHARACTER SET utf8mb4,
  inventoryItemId INT NOT NULL,
  inventoryItemName VARCHAR(150) CHARACTER SET utf8mb4,
  quantityReduced INT NOT NULL,
  quantityBefore INT NOT NULL,
  quantityAfter INT NOT NULL,
  reducedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (inventoryItemId) REFERENCES inventory(id) ON DELETE CASCADE,
  INDEX idx_appointment_id (appointmentId),
  INDEX idx_patient_id (patientId),
  INDEX idx_reduced_date (reducedAt),
  INDEX idx_item_id (inventoryItemId)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert sample appointments
INSERT INTO appointments (patientId, patientName, appointmentDateTime, type, duration, status, notes) VALUES
(1, 'Krista', '2025-02-06 10:00:00', 'Braces Adjustment', 45, 'scheduled', 'Monthly braces adjustment'),
(2, 'Sarah', '2025-02-15 14:00:00', 'Root Canal', 90, 'scheduled', 'Tooth #14');

-- Insert sample inventory
INSERT INTO inventory (name, category, quantity, minQuantity, unit, unit_type, pieces_per_box, remaining_pieces, supplier, cost) VALUES
('Nitrile Gloves (Box)', 'PPE', 45, 20, 'box', 'box', 40, 40, 'MedSupply Co.', 12.99),
('Dental Anesthetic', 'Medications', 15, 25, 'vial', 'piece', NULL, NULL, 'PharmaDent', 45.00),
('Composite Filling Material', 'Restorative', 8, 10, 'syringe', 'piece', NULL, NULL, 'DentalCare Inc.', 78.50);

-- Insert sample service prices
INSERT INTO servicePrices (serviceName, description, price, category, duration) VALUES
('Teeth Cleaning', 'Professional dental cleaning and polishing', 1500, 'Preventive', '45 minutes'),
('Tooth Extraction', 'Simple tooth extraction (includes anesthesia)', 2000, 'Surgery', '30 minutes'),
('Pasta (Filling)', 'Dental filling for cavities', 1800, 'Restorative', '60 minutes'),
('Braces Installation', 'Complete braces installation (upper and lower)', 35000, 'Orthodontics', '2 hours'),
('Braces Adjustment', 'Monthly braces tightening and maintenance', 500, 'Orthodontics', '30 minutes');
