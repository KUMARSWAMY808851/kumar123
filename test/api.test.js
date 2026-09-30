const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

// Set test environment variable for SQLite database path
const testDbPath = path.join(__dirname, 'test_database.db');
process.env.DB_PATH = testDbPath;

const app = require('../server');

describe('Student Management System API Integration Tests', () => {
  let server;
  let baseUrl;
  let authToken;

  before(async () => {
    // Remove existing test db if any
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch (e) {}
    }

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => {
      server.close(() => {
        if (fs.existsSync(testDbPath)) {
          try { fs.unlinkSync(testDbPath); } catch (e) {}
        }
        resolve();
      });
    });
  });

  it('1. POST /api/auth/register - Register new user', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'password123'
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.ok(data.token);
    assert.strictEqual(data.user.username, 'testuser');
  });

  it('2. POST /api/auth/login - Login user and receive JWT', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'password123'
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.token);
    authToken = data.token;
  });

  it('3. GET /api/auth/me - Verify active session', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.user.username, 'testuser');
  });

  it('4. POST /api/students - Add a new student record', async () => {
    const newStudent = {
      student_id: 'STU-9999',
      name: 'John Test',
      email: 'john.test@example.com',
      phone: '+1-555-9999',
      department: 'Computer Science',
      grade_level: 'Junior',
      gpa: 3.80,
      status: 'Active'
    };

    const res = await fetch(`${baseUrl}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(newStudent)
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.student.student_id, 'STU-9999');
    assert.strictEqual(data.student.name, 'John Test');
  });

  it('5. GET /api/students - Search and filter students', async () => {
    const res = await fetch(`${baseUrl}/api/students?search=John Test&department=Computer Science`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.students.length, 1);
    assert.strictEqual(data.students[0].name, 'John Test');
  });

  it('6. PUT /api/students/:id - Update student record', async () => {
    // Search student first to get ID
    const searchRes = await fetch(`${baseUrl}/api/students?search=STU-9999`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const searchData = await searchRes.json();
    const studentId = searchData.students[0].id;

    const updatePayload = {
      student_id: 'STU-9999',
      name: 'John Test Updated',
      email: 'john.test@example.com',
      phone: '+1-555-9999',
      department: 'Computer Science',
      grade_level: 'Senior',
      gpa: 3.95,
      status: 'Active'
    };

    const res = await fetch(`${baseUrl}/api/students/${studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(updatePayload)
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.student.name, 'John Test Updated');
    assert.strictEqual(data.student.grade_level, 'Senior');
    assert.strictEqual(data.student.gpa, 3.95);
  });

  it('7. GET /api/dashboard/stats - Verify dashboard metrics', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard/stats`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.totalStudents >= 1);
    assert.ok(typeof data.averageGpa === 'number');
  });

  it('8. DELETE /api/students/:id - Delete student record', async () => {
    const searchRes = await fetch(`${baseUrl}/api/students?search=STU-9999`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const searchData = await searchRes.json();
    const studentId = searchData.students[0].id;

    const res = await fetch(`${baseUrl}/api/students/${studentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);

    // Verify deletion
    const verifyRes = await fetch(`${baseUrl}/api/students/${studentId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    assert.strictEqual(verifyRes.status, 404);
  });

  it('9. POST /api/students - Reject invalid GPA (> 4.0)', async () => {
    const invalidStudent = {
      student_id: 'STU-8888',
      name: 'Bad GPA',
      email: 'bad.gpa@example.com',
      phone: '+1-555-8888',
      department: 'Physics',
      grade_level: 'Freshman',
      gpa: 5.0,
      status: 'Active'
    };

    const res = await fetch(`${baseUrl}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(invalidStudent)
    });

    assert.strictEqual(res.status, 400);
  });
});
