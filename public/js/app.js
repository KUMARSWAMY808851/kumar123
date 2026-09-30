document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    token: localStorage.getItem('edutrack_token') || null,
    user: JSON.parse(localStorage.getItem('edutrack_user') || 'null'),
    currentView: 'dashboard',
    students: [],
    page: 1,
    limit: 10,
    totalPages: 1,
    totalRecords: 0,
    search: '',
    departmentFilter: '',
    gradeFilter: '',
    statusFilter: '',
    sortBy: 'id',
    sortOrder: 'DESC',
    selectedStudentIdToDelete: null
  };

  // DOM Elements
  const authSection = document.getElementById('auth-section');
  const appSection = document.getElementById('app-section');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showRegisterBtn = document.getElementById('show-register');
  const showLoginBtn = document.getElementById('show-login');
  const authTitle = document.getElementById('auth-title');
  const authSubtitle = document.getElementById('auth-subtitle');

  // Sidebar & Topbar Elements
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
  const pageHeading = document.getElementById('page-heading');
  const navLinks = document.querySelectorAll('.nav-link');
  const logoutBtn = document.getElementById('logout-btn');
  const userDisplayName = document.getElementById('user-display-name');
  const userDisplayEmail = document.getElementById('user-display-email');
  const quickAddBtn = document.getElementById('quick-add-btn');

  // Dashboard Elements
  const statTotalStudents = document.getElementById('stat-total-students');
  const statActiveStudents = document.getElementById('stat-active-students');
  const statAvgGpa = document.getElementById('stat-avg-gpa');
  const statDepartments = document.getElementById('stat-departments');
  const departmentList = document.getElementById('department-list');
  const recentStudentsTbody = document.getElementById('recent-students-tbody');
  const viewAllStudentsLink = document.getElementById('view-all-students-link');

  // Students Directory Elements
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const filterDepartment = document.getElementById('filter-department');
  const filterGrade = document.getElementById('filter-grade');
  const filterStatus = document.getElementById('filter-status');
  const studentsTableBody = document.getElementById('students-table-body');
  const noStudentsMessage = document.getElementById('no-students-message');
  const addStudentModalBtn = document.getElementById('add-student-modal-btn');
  const prevPageBtn = document.getElementById('prev-page-btn');
  const nextPageBtn = document.getElementById('next-page-btn');
  const pageIndicator = document.getElementById('page-indicator');
  const pageStart = document.getElementById('page-start');
  const pageEnd = document.getElementById('page-end');
  const totalRecordsEl = document.getElementById('total-records');

  // Modal Elements
  const studentModal = document.getElementById('student-modal');
  const studentForm = document.getElementById('student-form');
  const modalTitle = document.getElementById('modal-title');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelModalBtn = document.getElementById('cancel-modal-btn');

  // Delete Modal Elements
  const deleteModal = document.getElementById('delete-modal');
  const deleteStudentName = document.getElementById('delete-student-name');
  const closeDeleteModalBtn = document.getElementById('close-delete-modal-btn');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

  // Toast Container
  const toastContainer = document.getElementById('toast-container');

  // Helper Toast Function
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-exclamation';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${iconClass} toast-icon"></i>
      <span class="toast-message">${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // API Request Wrapper with Auth Header
  async function apiFetch(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    try {
      const response = await fetch(endpoint, { ...options, headers });
      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        // Unauthorized or Expired Token
        handleLogout();
        showToast('Session expired. Please log in again.', 'warning');
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Request failed.');
      }

      return data;
    } catch (err) {
      console.error(`API Error (${endpoint}):`, err);
      throw err;
    }
  }

  // Initialization Check
  function initApp() {
    if (state.token && state.user) {
      authSection.classList.add('hidden');
      appSection.classList.remove('hidden');
      userDisplayName.textContent = state.user.username;
      userDisplayEmail.textContent = state.user.email;
      switchView(state.currentView);
    } else {
      authSection.classList.remove('hidden');
      appSection.classList.add('hidden');
    }
  }

  // View Switcher
  function switchView(viewName) {
    state.currentView = viewName;
    navLinks.forEach(link => {
      if (link.dataset.view === viewName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    document.querySelectorAll('.content-view').forEach(view => {
      view.classList.add('hidden');
    });

    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
      targetView.classList.remove('hidden');
    }

    if (viewName === 'dashboard') {
      pageHeading.textContent = 'Dashboard';
      loadDashboardStats();
    } else if (viewName === 'students') {
      pageHeading.textContent = 'Students Directory';
      loadStudents();
    }

    // Close mobile sidebar if open
    sidebar.classList.remove('active');
  }

  // ================= AUTHENTICATION HANDLERS =================
  showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    authTitle.textContent = 'Create Account';
    authSubtitle.textContent = 'Register to manage student records';
  });

  showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    authTitle.textContent = 'Welcome Back';
    authSubtitle.textContent = 'Sign in to manage student records and analytics';
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('edutrack_token', data.token);
      localStorage.setItem('edutrack_user', JSON.stringify(data.user));

      showToast('Successfully logged in!', 'success');
      initApp();
    } catch (err) {
      showToast(err.message || 'Login failed.', 'error');
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password })
      });

      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('edutrack_token', data.token);
      localStorage.setItem('edutrack_user', JSON.stringify(data.user));

      showToast('Account created successfully!', 'success');
      initApp();
    } catch (err) {
      showToast(err.message || 'Registration failed.', 'error');
    }
  });

  function handleLogout() {
    state.token = null;
    state.user = null;
    localStorage.removeItem('edutrack_token');
    localStorage.removeItem('edutrack_user');
    loginForm.reset();
    registerForm.reset();
    initApp();
  }

  logoutBtn.addEventListener('click', () => {
    handleLogout();
    showToast('Logged out successfully.', 'info');
  });

  // Sidebar toggle for mobile
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });

  sidebarCloseBtn.addEventListener('click', () => {
    sidebar.classList.remove('active');
  });

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(link.dataset.view);
    });
  });

  viewAllStudentsLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('students');
  });

  // ================= DASHBOARD LOGIC =================
  async function loadDashboardStats() {
    try {
      const stats = await apiFetch('/api/dashboard/stats');

      statTotalStudents.textContent = stats.totalStudents;
      statActiveStudents.textContent = stats.activeStudents;
      statAvgGpa.textContent = stats.averageGpa.toFixed(2);
      statDepartments.textContent = stats.departmentCount;

      // Render department distribution
      departmentList.innerHTML = '';
      if (stats.departmentDistribution && stats.departmentDistribution.length > 0) {
        const total = stats.totalStudents || 1;
        stats.departmentDistribution.forEach(dept => {
          const percent = Math.round((dept.count / total) * 100);
          const deptEl = document.createElement('div');
          deptEl.className = 'dept-item';
          deptEl.innerHTML = `
            <div class="dept-info">
              <span>${dept.department}</span>
              <span>${dept.count} (${percent}%)</span>
            </div>
            <div class="dept-progress-bg">
              <div class="dept-progress-bar" style="width: ${percent}%;"></div>
            </div>
          `;
          departmentList.appendChild(deptEl);
        });
      } else {
        departmentList.innerHTML = '<p class="text-muted text-sm">No department data available.</p>';
      }

      // Render recent students
      recentStudentsTbody.innerHTML = '';
      if (stats.recentStudents && stats.recentStudents.length > 0) {
        stats.recentStudents.forEach(s => {
          const tr = document.createElement('tr');
          const statusBadgeClass = s.status === 'Active' ? 'badge-active' : 'badge-inactive';
          tr.innerHTML = `
            <td><strong>${s.student_id}</strong></td>
            <td>${s.name}</td>
            <td>${s.department}</td>
            <td>${s.grade_level}</td>
            <td><span class="badge ${statusBadgeClass}">${s.status}</span></td>
          `;
          recentStudentsTbody.appendChild(tr);
        });
      } else {
        recentStudentsTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No students registered yet.</td></tr>';
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  // ================= STUDENTS DIRECTORY LOGIC =================
  async function loadStudents() {
    try {
      const queryParams = new URLSearchParams({
        page: state.page,
        limit: state.limit,
        search: state.search,
        department: state.departmentFilter,
        grade_level: state.gradeFilter,
        status: state.statusFilter,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder
      });

      const data = await apiFetch(`/api/students?${queryParams.toString()}`);
      state.students = data.students;
      state.totalPages = data.totalPages;
      state.totalRecords = data.total;

      renderStudentsTable();
      renderPaginationControls();
    } catch (err) {
      showToast('Failed to load students directory.', 'error');
    }
  }

  function renderStudentsTable() {
    studentsTableBody.innerHTML = '';

    if (!state.students || state.students.length === 0) {
      noStudentsMessage.classList.remove('hidden');
      return;
    }

    noStudentsMessage.classList.add('hidden');

    state.students.forEach(s => {
      const tr = document.createElement('tr');
      const statusBadgeClass = s.status === 'Active' ? 'badge-active' : 'badge-inactive';

      tr.innerHTML = `
        <td><strong>${s.student_id}</strong></td>
        <td>
          <div class="font-weight-600">${s.name}</div>
        </td>
        <td>
          <div>${s.email}</div>
          <div class="text-muted text-sm">${s.phone}</div>
        </td>
        <td>${s.department}</td>
        <td>${s.grade_level}</td>
        <td><span class="gpa-pill">${s.gpa.toFixed(2)}</span></td>
        <td><span class="badge ${statusBadgeClass}">${s.status}</span></td>
        <td class="text-right">
          <button class="btn-icon edit-btn" data-id="${s.id}" title="Edit Student">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-icon btn-icon-danger delete-btn" data-id="${s.id}" data-name="${s.name}" title="Delete Student">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      `;

      studentsTableBody.appendChild(tr);
    });

    // Attach Event Listeners to Edit and Delete Buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditStudentModal(btn.dataset.id));
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => openDeleteStudentModal(btn.dataset.id, btn.dataset.name));
    });
  }

  function renderPaginationControls() {
    totalRecordsEl.textContent = state.totalRecords;

    if (state.totalRecords === 0) {
      pageStart.textContent = '0';
      pageEnd.textContent = '0';
    } else {
      const start = (state.page - 1) * state.limit + 1;
      const end = Math.min(state.page * state.limit, state.totalRecords);
      pageStart.textContent = start;
      pageEnd.textContent = end;
    }

    pageIndicator.textContent = `Page ${state.page} of ${state.totalPages}`;

    prevPageBtn.disabled = state.page <= 1;
    nextPageBtn.disabled = state.page >= state.totalPages;
  }

  // Pagination Handlers
  prevPageBtn.addEventListener('click', () => {
    if (state.page > 1) {
      state.page--;
      loadStudents();
    }
  });

  nextPageBtn.addEventListener('click', () => {
    if (state.page < state.totalPages) {
      state.page++;
      loadStudents();
    }
  });

  // Search & Filters
  let searchTimeout = null;
  searchInput.addEventListener('input', (e) => {
    state.search = e.target.value;
    if (state.search.length > 0) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.page = 1;
      loadStudents();
    }, 300);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.search = '';
    clearSearchBtn.classList.add('hidden');
    state.page = 1;
    loadStudents();
  });

  filterDepartment.addEventListener('change', (e) => {
    state.departmentFilter = e.target.value;
    state.page = 1;
    loadStudents();
  });

  filterGrade.addEventListener('change', (e) => {
    state.gradeFilter = e.target.value;
    state.page = 1;
    loadStudents();
  });

  filterStatus.addEventListener('change', (e) => {
    state.statusFilter = e.target.value;
    state.page = 1;
    loadStudents();
  });

  // Table Column Sorting
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (state.sortBy === col) {
        state.sortOrder = state.sortOrder === 'ASC' ? 'DESC' : 'ASC';
      } else {
        state.sortBy = col;
        state.sortOrder = 'ASC';
      }

      // Update Header Icons
      document.querySelectorAll('th.sortable i').forEach(icon => {
        icon.className = 'fa-solid fa-sort';
      });
      const icon = th.querySelector('i');
      icon.className = state.sortOrder === 'ASC' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';

      loadStudents();
    });
  });

  // ================= ADD / EDIT MODAL HANDLERS =================
  function openAddStudentModal() {
    studentForm.reset();
    document.getElementById('student-primary-id').value = '';
    modalTitle.textContent = 'Add New Student';
    studentModal.classList.remove('hidden');
  }

  async function openEditStudentModal(id) {
    try {
      const student = await apiFetch(`/api/students/${id}`);
      document.getElementById('student-primary-id').value = student.id;
      document.getElementById('student-id-input').value = student.student_id;
      document.getElementById('student-name-input').value = student.name;
      document.getElementById('student-email-input').value = student.email;
      document.getElementById('student-phone-input').value = student.phone;
      document.getElementById('student-dept-input').value = student.department;
      document.getElementById('student-grade-input').value = student.grade_level;
      document.getElementById('student-gpa-input').value = student.gpa;
      document.getElementById('student-status-input').value = student.status;

      modalTitle.textContent = 'Edit Student Record';
      studentModal.classList.remove('hidden');
    } catch (err) {
      showToast('Failed to fetch student details.', 'error');
    }
  }

  function closeStudentModal() {
    studentModal.classList.add('hidden');
  }

  quickAddBtn.addEventListener('click', () => {
    switchView('students');
    openAddStudentModal();
  });

  addStudentModalBtn.addEventListener('click', openAddStudentModal);
  closeModalBtn.addEventListener('click', closeStudentModal);
  cancelModalBtn.addEventListener('click', closeStudentModal);

  studentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const primaryId = document.getElementById('student-primary-id').value;
    const payload = {
      student_id: document.getElementById('student-id-input').value.trim(),
      name: document.getElementById('student-name-input').value.trim(),
      email: document.getElementById('student-email-input').value.trim(),
      phone: document.getElementById('student-phone-input').value.trim(),
      department: document.getElementById('student-dept-input').value,
      grade_level: document.getElementById('student-grade-input').value,
      gpa: parseFloat(document.getElementById('student-gpa-input').value),
      status: document.getElementById('student-status-input').value
    };

    try {
      if (primaryId) {
        // Edit Operation
        await apiFetch(`/api/students/${primaryId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        showToast('Student record updated successfully!', 'success');
      } else {
        // Create Operation
        await apiFetch('/api/students', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast('Student added successfully!', 'success');
      }

      closeStudentModal();
      loadStudents();
    } catch (err) {
      showToast(err.message || 'Operation failed.', 'error');
    }
  });

  // ================= DELETE MODAL HANDLERS =================
  function openDeleteStudentModal(id, name) {
    state.selectedStudentIdToDelete = id;
    deleteStudentName.textContent = name;
    deleteModal.classList.remove('hidden');
  }

  function closeDeleteModal() {
    state.selectedStudentIdToDelete = null;
    deleteModal.classList.add('hidden');
  }

  closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);

  confirmDeleteBtn.addEventListener('click', async () => {
    if (!state.selectedStudentIdToDelete) return;

    try {
      await apiFetch(`/api/students/${state.selectedStudentIdToDelete}`, {
        method: 'DELETE'
      });
      showToast('Student record deleted successfully.', 'success');
      closeDeleteModal();
      loadStudents();
    } catch (err) {
      showToast(err.message || 'Failed to delete student.', 'error');
    }
  });

  // Initialize
  initApp();
});
