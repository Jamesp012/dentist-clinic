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

// Get all employees
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [employees] = await pool.query(`
      SELECT e.*, u.username, u.email as userEmail, u.isFirstLogin, u.accountStatus
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
      SELECT e.*, u.username, u.email as userEmail, u.isFirstLogin, u.accountStatus
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
    const { name, position, phone, email, address, dateHired } = req.body;
    
    const [result] = await pool.query(
      'INSERT INTO employees (name, position, phone, email, address, dateHired) VALUES (?, ?, ?, ?, ?, ?)',
      [name, position, phone, email, address, dateHired]
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
    
    // Generate unique username and code
    const username = await generateUsername(employee.name);
    const generatedCode = generateUniqueCode();
    
    // Hash the generated code as password
    const hashedPassword = await bcryptjs.hash(generatedCode, 10);
    
    // Create user account with position (pending status until first login)
    const [userResult] = await pool.query(
      'INSERT INTO users (username, password, fullName, email, phone, role, position, isFirstLogin, accountStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, employee.name, employee.email, employee.phone, role, employee.position, true, 'pending']
    );
    
    // Update employee with user_id and generated code
    await pool.query(
      'UPDATE employees SET user_id = ?, generatedCode = ?, isCodeUsed = FALSE WHERE id = ?',
      [userResult.insertId, generatedCode, employeeId]
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
    const { name, position, phone, email, address, dateHired } = req.body;
    
    await pool.query(
      'UPDATE employees SET name = ?, position = ?, phone = ?, email = ?, address = ?, dateHired = ? WHERE id = ?',
      [name, position, phone, email, address, dateHired, req.params.id]
    );
    
    // Also update user table if user_id exists
    const [employee] = await pool.query('SELECT user_id FROM employees WHERE id = ?', [req.params.id]);
    if (employee.length > 0 && employee[0].user_id) {
      await pool.query(
        'UPDATE users SET fullName = ?, email = ?, phone = ? WHERE id = ?',
        [name, email, phone, employee[0].user_id]
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
