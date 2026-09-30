const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-student-mgmt-2025';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Token missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

// ================= AUTH ROUTES =================

// Register User
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (username, email, password) VALUES (?, ?, ?)
    `).run(username, email, hashedPassword);

    const newUser = { id: result.lastInsertRowid, username, email, role: 'admin' };
    const token = jwt.sign(newUser, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Login User
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required.' });
    }

    const user = db.prepare(`
      SELECT * FROM users WHERE username = ? OR email = ?
    `).get(username, username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const userData = { id: user.id, username: user.username, email: user.email, role: user.role };
    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Login successful!',
      token,
      user: userData
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Get Current User
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ================= DASHBOARD STATS ROUTE =================

app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  try {
    const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
    const activeStudents = db.prepare("SELECT COUNT(*) as count FROM students WHERE status = 'Active'").get().count;

    const avgGpaResult = db.prepare('SELECT AVG(gpa) as avgGpa FROM students').get();
    const averageGpa = avgGpaResult.avgGpa ? Number(avgGpaResult.avgGpa.toFixed(2)) : 0;

    const deptResult = db.prepare('SELECT COUNT(DISTINCT department) as count FROM students').get();
    const departmentCount = deptResult.count;

    const departmentDistribution = db.prepare(`
      SELECT department, COUNT(*) as count FROM students GROUP BY department
    `).all();

    const recentStudents = db.prepare(`
      SELECT * FROM students ORDER BY id DESC LIMIT 5
    `).all();

    res.json({
      totalStudents,
      activeStudents,
      averageGpa,
      departmentCount,
      departmentDistribution,
      recentStudents
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics.' });
  }
});

// ================= STUDENTS CRUD ROUTES =================

// Get Students (Search, Filter, Pagination, Sorting)
app.get('/api/students', authenticateToken, (req, res) => {
  try {
    const {
      search = '',
      department = '',
      grade_level = '',
      status = '',
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'DESC'
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    // Validate allowed sort columns to prevent SQL injection
    const allowedSortCols = ['id', 'student_id', 'name', 'email', 'grade_level', 'gpa', 'department', 'status', 'created_at'];
    const validSortBy = allowedSortCols.includes(sortBy) ? sortBy : 'id';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search.trim()) {
      whereClause += ' AND (name LIKE ? OR student_id LIKE ? OR email LIKE ? OR department LIKE ?)';
      const queryStr = `%${search.trim()}%`;
      params.push(queryStr, queryStr, queryStr, queryStr);
    }

    if (department.trim()) {
      whereClause += ' AND department = ?';
      params.push(department.trim());
    }

    if (grade_level.trim()) {
      whereClause += ' AND grade_level = ?';
      params.push(grade_level.trim());
    }

    if (status.trim()) {
      whereClause += ' AND status = ?';
      params.push(status.trim());
    }

    // Get Total Count
    const countSql = `SELECT COUNT(*) as count FROM students ${whereClause}`;
    const totalCount = db.prepare(countSql).get(...params).count;

    // Fetch paginated data
    const dataSql = `
      SELECT * FROM students
      ${whereClause}
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT ? OFFSET ?
    `;
    const students = db.prepare(dataSql).all(...params, limitNum, offset);

    res.json({
      students,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum) || 1
    });
  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ error: 'Failed to retrieve students.' });
  }
});

// Get Single Student by ID
app.get('/api/students/:id', authenticateToken, (req, res) => {
  try {
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    res.json(student);
  } catch (err) {
    console.error('Get student error:', err);
    res.status(500).json({ error: 'Failed to retrieve student.' });
  }
});

// Create Student
app.post('/api/students', authenticateToken, (req, res) => {
  try {
    const { student_id, name, email, phone, grade_level, gpa, department, status } = req.body;

    if (!student_id || !name || !email || !phone || !grade_level || gpa === undefined || !department) {
      return res.status(400).json({ error: 'All fields (Student ID, Name, Email, Phone, Grade, GPA, Department) are required.' });
    }

    const numericGpa = parseFloat(gpa);
    if (isNaN(numericGpa) || numericGpa < 0.0 || numericGpa > 4.0) {
      return res.status(400).json({ error: 'GPA must be a valid number between 0.00 and 4.00.' });
    }

    // Check duplicate student_id or email
    const existing = db.prepare('SELECT id FROM students WHERE student_id = ? OR email = ?').get(student_id, email);
    if (existing) {
      return res.status(400).json({ error: 'Student ID or Email already exists.' });
    }

    const studentStatus = status || 'Active';

    const result = db.prepare(`
      INSERT INTO students (student_id, name, email, phone, grade_level, gpa, department, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(student_id, name, email, phone, grade_level, numericGpa, department, studentStatus);

    const newStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      message: 'Student added successfully!',
      student: newStudent
    });
  } catch (err) {
    console.error('Add student error:', err);
    res.status(500).json({ error: 'Failed to add student.' });
  }
});

// Update Student
app.put('/api/students/:id', authenticateToken, (req, res) => {
  try {
    const studentId = req.params.id;
    const existingStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const { student_id, name, email, phone, grade_level, gpa, department, status } = req.body;

    if (!student_id || !name || !email || !phone || !grade_level || gpa === undefined || !department) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const numericGpa = parseFloat(gpa);
    if (isNaN(numericGpa) || numericGpa < 0.0 || numericGpa > 4.0) {
      return res.status(400).json({ error: 'GPA must be a valid number between 0.00 and 4.00.' });
    }

    // Check duplicate student_id or email for other records
    const duplicate = db.prepare('SELECT id FROM students WHERE (student_id = ? OR email = ?) AND id != ?').get(student_id, email, studentId);
    if (duplicate) {
      return res.status(400).json({ error: 'Student ID or Email is already used by another student.' });
    }

    db.prepare(`
      UPDATE students
      SET student_id = ?, name = ?, email = ?, phone = ?, grade_level = ?, gpa = ?, department = ?, status = ?
      WHERE id = ?
    `).run(student_id, name, email, phone, grade_level, numericGpa, department, status || 'Active', studentId);

    const updatedStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    res.json({
      message: 'Student record updated successfully!',
      student: updatedStudent
    });
  } catch (err) {
    console.error('Update student error:', err);
    res.status(500).json({ error: 'Failed to update student record.' });
  }
});

// Delete Student
app.delete('/api/students/:id', authenticateToken, (req, res) => {
  try {
    const studentId = req.params.id;
    const existingStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    db.prepare('DELETE FROM students WHERE id = ?').run(studentId);
    res.json({ message: 'Student record deleted successfully!' });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ error: 'Failed to delete student record.' });
  }
});

// Fallback to index.html for SPA frontend
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    return res.sendFile(indexPath, (err) => {
      if (err) next();
    });
  }
  next();
});

// Export app for testing, start server if main file
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
