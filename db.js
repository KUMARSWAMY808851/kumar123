const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initDb() {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create students table
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      grade_level TEXT NOT NULL,
      gpa REAL NOT NULL,
      department TEXT NOT NULL,
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin user if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, ?)
    `).run('admin', 'admin@example.com', hashedPassword, 'admin');
    console.log('Seeded default admin user: admin / admin123');
  }

  // Seed sample students if no students exist
  const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
  if (studentCount === 0) {
    const insertStudent = db.prepare(`
      INSERT INTO students (student_id, name, email, phone, grade_level, gpa, department, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleStudents = [
      ['STU-1001', 'Alice Johnson', 'alice.johnson@example.com', '+1-555-0101', 'Senior', 3.85, 'Computer Science', 'Active'],
      ['STU-1002', 'Bob Smith', 'bob.smith@example.com', '+1-555-0102', 'Junior', 3.42, 'Electrical Engineering', 'Active'],
      ['STU-1003', 'Charlie Brown', 'charlie.brown@example.com', '+1-555-0103', 'Sophomore', 3.91, 'Mathematics', 'Active'],
      ['STU-1004', 'Diana Prince', 'diana.prince@example.com', '+1-555-0104', 'Freshman', 3.20, 'Business Administration', 'Inactive'],
      ['STU-1005', 'Evan Wright', 'evan.wright@example.com', '+1-555-0105', 'Senior', 3.75, 'Computer Science', 'Active'],
      ['STU-1006', 'Fiona Gallagher', 'fiona.gallagher@example.com', '+1-555-0106', 'Junior', 2.98, 'Biology', 'Active'],
      ['STU-1007', 'George Clark', 'george.clark@example.com', '+1-555-0107', 'Sophomore', 3.60, 'Physics', 'Active'],
      ['STU-1008', 'Hannah Abbott', 'hannah.abbott@example.com', '+1-555-0108', 'Freshman', 3.95, 'Chemistry', 'Active']
    ];

    const insertMany = db.transaction((students) => {
      for (const student of students) {
        insertStudent.run(...student);
      }
    });

    insertMany(sampleStudents);
    console.log(`Seeded ${sampleStudents.length} sample students.`);
  }
}

initDb();

module.exports = db;
