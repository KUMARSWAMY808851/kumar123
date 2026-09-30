# EduTrack - Student Management System

EduTrack is a modern, full-stack Student Management System built using HTML, CSS, JavaScript (ES6+), Node.js, Express, and SQLite (`better-sqlite3`).

It provides a complete, responsive solution for managing student records, tracking department statistics, and managing user authentication with JSON Web Tokens (JWT).

---

## 🌟 Key Features

- **🔐 Authentication & User Roles**: User registration and login using JWT authentication and bcrypt password hashing.
- **📊 Analytics Dashboard**: Real-time metrics including total enrolled students, active student count, department distribution, and average GPA calculation.
- **👨‍🎓 Student Management Directory**:
  - Add new student records with validation (Student ID, Name, Email, Phone, Grade, GPA, Department).
  - Edit existing student information.
  - Delete student records with modal confirmation.
  - Live search across student name, ID, email, and department.
  - Multi-attribute filtering by department, grade level, and enrollment status.
  - Sortable table columns and dynamic pagination.
- **📱 Responsive UI**: Mobile-first design supporting mobile, tablet, and desktop viewports with a collapsible navigation sidebar and toast feedback notifications.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Modern CSS (Flexbox, Grid, CSS Variables), JavaScript (Vanilla ES6+ Fetch API)
- **Backend**: Node.js, Express.js
- **Database**: SQLite (`better-sqlite3`)
- **Authentication**: JWT (`jsonwebtoken`), Password Hashing (`bcryptjs`)
- **Testing**: Node.js Test Runner (`node --test`)

---

## 📂 Project Structure

```text
├── db.js                # SQLite database setup, table initialization & seeding
├── server.js            # Express server & REST API endpoints
├── test/
│   └── api.test.js      # Integration test suite
├── public/              # Static frontend assets
│   ├── index.html       # Single Page Application HTML markup
│   ├── css/
│   │   └── style.css    # Responsive CSS design system
│   └── js/
│       └── app.js       # SPA client state, API fetch, and DOM logic
├── package.json         # Dependencies & scripts
└── README.md            # Setup and documentation
```

---

## ⚙️ Setup & Installation Instructions

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (v9 or higher)

### Step 1: Install Dependencies
Clone the repository and install dependencies:
```bash
npm install
```

### Step 2: Start the Application
Run the backend server:
```bash
npm start
```
The server will start at `http://localhost:3000`.

Open your browser and navigate to `http://localhost:3000` to access the application.

---

## 🔑 Default Credentials

On first launch, the database is automatically initialized and seeded with sample data and a default administrator account:

- **Username / Email**: `admin` or `admin@example.com`
- **Password**: `admin123`

*(You can also register a new account directly from the login interface).*

---

## 🧪 Running Automated Tests

To execute the automated API integration tests:
```bash
npm test
```

---

## 📡 REST API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register a new user (`{ username, email, password }`)
- `POST /api/auth/login` - Authenticate user and receive JWT (`{ username, password }`)
- `GET /api/auth/me` - Get current user profile (Requires Bearer Token)

### Dashboard Endpoint
- `GET /api/dashboard/stats` - Fetch overall stats and department metrics (Requires Bearer Token)

### Student CRUD Endpoints
- `GET /api/students` - Retrieve paginated students list (Query params: `page`, `limit`, `search`, `department`, `grade_level`, `status`, `sortBy`, `sortOrder`)
- `GET /api/students/:id` - Fetch single student details by ID
- `POST /api/students` - Create a new student record
- `PUT /api/students/:id` - Update existing student record
- `DELETE /api/students/:id` - Remove student record
