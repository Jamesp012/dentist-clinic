const express = require('express');
const bcryptjs = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Generate unique code (8 characters alphanumeric)
function generateUniqueCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Generate unique username based on employee name
async function generateUsername(name) {
  const baseName = name.toLowerCase().replace(/\s+/g, '.');
  let username = baseName;
  let counter = 1;
  
  // Check if username exists, if so, add number
  while (true) {
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length === 0) break;
    username = `${baseName}${counter}`;
    counter++;
  }
  
  return username;
}

function normalizeDateInput(value) {
  if (!value) {
    return { value: null, valid: true };
  }

  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) {
    return { value: null, valid: true };
  }

  let candidate = raw;
  if (raw.includes('/')) {
    const [day, month, year] = raw.split('/');
    if (!day || !month || !year) {
      return { value: null, valid: false };
    }
    candidate = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    return { value: null, valid: false };
  }

  return { value: parsed.toISOString().split('T')[0], valid: true };
}

// Fallback roster that keeps the UI populated when the employees table gets wiped.
const defaultEmployeeSeedData = [
  {
    name: 'Dr. Joseph\n\nMaaño',
    position: 'dentist',
    phone: '+639987654321',
    email: 'doctor@clinic.com',
    address: '123 Medical Plaza, Makati City',
    dateHired: '2020-01-14',
    accessLevel: 'Super Admin',
    isCodeUsed: true,
    userLookup: 'doctor'
  },
  {
    name: 'Almira\n\nMaaño',
    position: 'assistant',
    phone: '+639123456789',
    email: 'assistant@clinic.com',
    address: '456 Santos Street, Quezon City',
    dateHired: '2021-03-19',
    accessLevel: 'Admin',
    isCodeUsed: true,
    userLookup: 'assistant'
  },
  {
    name: 'Peter John\n\nRasay',
    position: 'assistant_dentist',
    phone: '+639123456789',
    email: 'pj@gmail.com',
    address: 'Potol, Tayabas',
    dateHired: '2026-02-05',
    accessLevel: 'Super Admin',
    isCodeUsed: true,
    generatedCode: '3FDE48F5'
  },
  {
    name: 'Krista Lyn\nAbella\nGob',
    position: 'assistant',
    phone: '+639321654978',
    email: 'krista@gmail.com',
    address: 'Tayabas',
    dateHired: null,
    accessLevel: 'Default Accounts',
    isCodeUsed: false
  },
  {
    name: 'Maria Aleli\nZarsadias\nRasay',
    position: 'assistant_dentist',
    phone: '+639532173662',
    email: 'aleli@gmail.com',
    address: 'Tayabas City',
    dateHired: '2026-02-04',
    accessLevel: 'Admin',
    isCodeUsed: false
  }
];

// Rehydrate employees table with defaults whenever it ends up empty.
async function seedEmployeesIfEmpty() {
  const [countResult] = await pool.query('SELECT COUNT(*) AS total FROM employees');
  if (countResult[0].total > 0) {
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [lockedCount] = await connection.query('SELECT COUNT(*) AS total FROM employees FOR UPDATE');
    if (lockedCount[0].total > 0) {
      await connection.rollback();
      return;
    }

    for (const employee of defaultEmployeeSeedData) {
      let userId = null;
      if (employee.userLookup) {
        const [users] = await connection.query('SELECT id FROM users WHERE username = ?', [employee.userLookup]);
        if (users.length > 0) {
          userId = users[0].id;
        }
      }

      await connection.query(
        `INSERT INTO employees (user_id, name, position, phone, email, address, dateHired, accessLevel, isCodeUsed, generatedCode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          employee.name,
          employee.position,
          employee.phone,
          employee.email,
          employee.address,
          employee.dateHired,
          employee.accessLevel,
          employee.isCodeUsed ? 1 : 0,
          employee.generatedCode || null
        ]
      );
    }

    await connection.commit();
    console.log('Seeded default employee records.');
  } catch (error) {
    await connection.rollback();
    console.error('Failed to seed default employees:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Get all employees
router.get('/', authMiddleware, async (req, res) => {
  try {
    await seedEmployeesIfEmpty();
    const [employees] = await pool.query(`
      SELECT e.*, u.username, u.email as userEmail, u.isFirstLogin, u.accountStatus, u.accessLevel
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      ORDER BY e.createdAt DESC
    `);
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single employee
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [employees] = await pool.query(`
      SELECT e.*, u.username, u.email as userEmail, u.isFirstLogin, u.accountStatus, u.accessLevel
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.id = ?
    `, [req.params.id]);
    
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(employees[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add employee (without user account initially)
router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('Adding new employee:', req.body);
    const { name, position, phone, email, address, dateHired, dateOfBirth, accessLevel } = req.body;

    const normalizedBirthdate = normalizeDateInput(dateOfBirth);
    if (!normalizedBirthdate.valid) {
      return res.status(400).json({ error: 'Invalid birthdate provided' });
    }

    const normalizedHireDate = normalizeDateInput(dateHired);
    if (!normalizedHireDate.valid || !normalizedHireDate.value) {
      return res.status(400).json({ error: 'Invalid hire date provided' });
    }
    
    const [result] = await pool.query(
      'INSERT INTO employees (name, position, phone, email, address, dateOfBirth, dateHired, accessLevel) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, position, phone, email, address, normalizedBirthdate.value, normalizedHireDate.value, accessLevel || 'Default Accounts']
    );
    
    console.log('Employee added successfully with ID:', result.insertId);
    res.status(201).json({ 
      message: 'Employee added successfully',
      employeeId: result.insertId
    });
  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate login credentials for employee
router.post('/:id/generate-credentials', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.params.id;
    
    // Get employee details
    const [employees] = await pool.query('SELECT * FROM employees WHERE id = ?', [employeeId]);
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const employee = employees[0];
    
    // Check if credentials already used (can regenerate if not used yet)
    if (employee.user_id && employee.isCodeUsed) {
      return res.status(400).json({ error: 'Employee has already logged in. Cannot regenerate credentials.' });
    }
    
    // If credentials exist but not used, delete old user and regenerate
    if (employee.user_id && !employee.isCodeUsed) {
      await pool.query('DELETE FROM users WHERE id = ?', [employee.user_id]);
      await pool.query('UPDATE employees SET user_id = NULL, generatedCode = NULL WHERE id = ?', [employeeId]);
    }
    
    // Map position to role
    let role = 'assistant';
    if (employee.position === 'dentist' || employee.position === 'assistant_dentist') {
      role = 'doctor';
    } else if (employee.position === 'assistant') {
      role = 'assistant';
    }
    
    // Determine accessLevel: set defaults for Dr. Joseph and Almira if not already set
    let accessLevel = employee.accessLevel || 'Default Accounts';
    if (employee.name === 'Dr. Joseph Maaño' || employee.name === 'Dr. Joseph') {
      accessLevel = 'Super Admin';
    } else if (employee.name === 'Almira') {
      accessLevel = 'Admin';
    }
    
    // Generate unique username and code
    const username = await generateUsername(employee.name);
    const generatedCode = generateUniqueCode();
    
    // Hash the generated code as password
    const hashedPassword = await bcryptjs.hash(generatedCode, 10);
    
    // Create user account with position and accessLevel (pending status until first login)
    const [userResult] = await pool.query(
      'INSERT INTO users (username, password, fullName, email, phone, role, position, accessLevel, isFirstLogin, accountStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, employee.name, employee.email, employee.phone, role, employee.position, accessLevel, true, 'pending']
    );
    
    // Update employee with user_id, generated code, and accessLevel
    await pool.query(
      'UPDATE employees SET user_id = ?, generatedCode = ?, isCodeUsed = FALSE, accessLevel = ? WHERE id = ?',
      [userResult.insertId, generatedCode, accessLevel, employeeId]
    );
    
    res.json({
      message: 'Credentials generated successfully',
      username,
      temporaryPassword: generatedCode
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update employee
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, position, phone, email, address, dateHired, dateOfBirth, accessLevel } = req.body;

    const normalizedBirthdate = normalizeDateInput(dateOfBirth);
    if (!normalizedBirthdate.valid) {
      return res.status(400).json({ error: 'Invalid birthdate provided' });
    }

    const normalizedHireDate = normalizeDateInput(dateHired);
    if (!normalizedHireDate.valid || !normalizedHireDate.value) {
      return res.status(400).json({ error: 'Invalid hire date provided' });
    }
    
    await pool.query(
      'UPDATE employees SET name = ?, position = ?, phone = ?, email = ?, address = ?, dateOfBirth = ?, dateHired = ?, accessLevel = ? WHERE id = ?',
      [name, position, phone, email, address, normalizedBirthdate.value, normalizedHireDate.value, accessLevel, req.params.id]
    );
    
    // Also update user table if user_id exists
    const [employee] = await pool.query('SELECT user_id FROM employees WHERE id = ?', [req.params.id]);
    if (employee.length > 0 && employee[0].user_id) {
      await pool.query(
        'UPDATE users SET fullName = ?, email = ?, phone = ?, accessLevel = ? WHERE id = ?',
        [name, email, phone, accessLevel, employee[0].user_id]
      );
    }
    
    res.json({ message: 'Employee updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete employee
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Get employee to check if has user account
    const [employee] = await pool.query('SELECT user_id FROM employees WHERE id = ?', [req.params.id]);
    
    if (employee.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Delete employee (will cascade delete user due to foreign key)
    await pool.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
