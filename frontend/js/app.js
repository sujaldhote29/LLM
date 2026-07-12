const API_URL = 'http://localhost:5000/api';

// --- State Management ---
let currentUser = null;
let token = null;

// --- DOM Elements ---
const homeView = document.getElementById('home-view');
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const appView = document.getElementById('app-view');
const forgotPasswordView = document.getElementById('forgot-password-view');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const forgotPasswordForm = document.getElementById('forgot-password-form');
const backLoginForgotBtn = document.getElementById('back-login-forgot');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutBtn = document.getElementById('logout-btn');

const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');

const homeLoginBtn = document.getElementById('home-login-btn');
const homeRegisterBtn = document.getElementById('home-register-btn');
const homeSearchBtn = document.getElementById('home-search-btn');

const publicSearchView = document.getElementById('public-search-view');
const backHomeSearchBtn = document.getElementById('back-home-search');
const publicSearchInput = document.getElementById('public-search-input');
const publicResultsContainer = document.getElementById('public-results-container');

const sidebarNav = document.getElementById('sidebar-nav');
const userNameDisplay = document.getElementById('user-name-display');
const userRoleDisplay = document.getElementById('user-role-display');
const dynamicContent = document.getElementById('dynamic-content');
const currentPageTitle = document.getElementById('current-page-title');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('savant_user');
    const storedToken = localStorage.getItem('savant_token');

    if (storedUser && storedToken) {
        currentUser = JSON.parse(storedUser);
        token = storedToken;
        showAppView();
    } else {
        showView(homeView);
    }

    startClock();
});

// --- View Navigation ---
function showView(viewElement) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    viewElement.classList.add('active');
}

homeLoginBtn.addEventListener('click', () => showView(loginView));
homeRegisterBtn.addEventListener('click', () => showView(registerView));

forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    showView(forgotPasswordView);
});

backLoginForgotBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showView(loginView);
});

homeSearchBtn.addEventListener('click', () => {
    showView(publicSearchView);
    fetchAndRenderPublicBooks();
});

document.getElementById('back-home-login').addEventListener('click', (e) => {
    e.preventDefault();
    showView(homeView);
});

document.getElementById('back-home-register').addEventListener('click', (e) => {
    e.preventDefault();
    showView(homeView);
});

backHomeSearchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showView(homeView);
});

publicSearchInput.addEventListener('input', (e) => {
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
        fetchAndRenderPublicBooks(e.target.value);
    }, 300);
});

async function fetchAndRenderPublicBooks(query = '') {
    try {
        publicResultsContainer.innerHTML = '<div class="page text-center" style="grid-column: 1 / -1; margin-top: 4rem;"><p class="text-secondary">Loading catalog...</p></div>';
        const res = await fetch(`${API_URL}/books/public?search=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        if (!data || data.length === 0) {
            publicResultsContainer.innerHTML = `<div class="page text-center" style="grid-column: 1 / -1; margin-top: 4rem;"><i class="ph ph-books" style="font-size: 4rem; color: var(--text-tertiary); margin-bottom: 1rem;"></i><h3 class="text-secondary">No books found.</h3></div>`;
            return;
        }

        publicResultsContainer.innerHTML = '';
        data.forEach(book => {
            const stockStatus = book.Stock > 0 
                ? `<span class="badge success">Available (${book.Stock})</span>` 
                : `<span class="badge danger">Out of Stock</span>`;
            
            publicResultsContainer.innerHTML += `
                <div class="stat-card" style="flex-direction: column; align-items: flex-start; gap: 0.5rem; justify-content: space-between; height: 100%;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.15rem; line-height: 1.3; margin-bottom: 0.25rem;">${book.Title}</h3>
                        <p class="text-secondary" style="margin: 0; font-size: 0.9rem;">By ${book.Author}</p>
                        <small class="text-tertiary" style="display: block; margin-top: 0.5rem;">${book.Category || 'General'} | ISBN: ${book.ISBN}</small>
                    </div>
                    <div style="margin-top: 0.5rem;">${stockStatus}</div>
                </div>
            `;
        });
    } catch (err) {
        console.error(err);
        publicResultsContainer.innerHTML = `<div class="page text-center" style="grid-column: 1 / -1;"><p class="text-danger">Failed to load catalog.</p></div>`;
    }
}

showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showView(registerView);
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showView(loginView);
});

function showAppView() {
    showView(appView);
    userNameDisplay.textContent = currentUser.name;
    userRoleDisplay.textContent = currentUser.role;
    buildNavigation();
    loadDashboard();
}

// --- Authentication UI ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const btn = loginForm.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Authenticating...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            token = data.token;
            localStorage.setItem('savant_user', JSON.stringify(currentUser));
            localStorage.setItem('savant_token', token);
            showToast('Login successful', 'success');
            showAppView();
            loginForm.reset();
        } else {
            showToast(data.message || 'Login failed', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Server connection error', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-password').value;

    const btn = registerForm.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Registering...';
    btn.disabled = true;

    try {
        // Members register as default 'Member' role
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password, role: 'Member' })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Registration successful! Please login.', 'success');
            showView(loginView);
            registerForm.reset();
        } else {
            showToast(data.message || 'Registration failed', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Server connection error', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    const phone = document.getElementById('forgot-phone').value;
    const newPassword = document.getElementById('forgot-new-password').value;

    const btn = forgotPasswordForm.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Resetting...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, phone, newPassword })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Password reset successfully! Please sign in.', 'success');
            showView(loginView);
            forgotPasswordForm.reset();
        } else {
            showToast(data.message || 'Password reset failed', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Server connection error', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

logoutBtn.addEventListener('click', () => {
    currentUser = null;
    token = null;
    localStorage.removeItem('savant_user');
    localStorage.removeItem('savant_token');
    showView(loginView);
});


// --- Navigation Builder (Role Based) ---
function buildNavigation() {
    sidebarNav.innerHTML = '';

    // Common routes
    addNavItem('Dashboard', 'ph-squares-four', loadDashboard, true);
    addNavItem('Book Catalog', 'ph-books', loadCatalog);

    // Member routes
    if (currentUser.role === 'Member') {
        addNavItem('My History & Fines', 'ph-clock-counter-clockwise', () => loadMemberHistory(currentUser.id));
    }

    // Librarian routes
    if (currentUser.role === 'Librarian' || currentUser.role === 'Admin') {
        // Shared staff routes would go here
    }
    
    // Strict Librarian only routes
    if (currentUser.role === 'Librarian') {
        addNavItem('Circulation Desk', 'ph-arrows-left-right', loadCirculation);
        addNavItem('Book Inventory', 'ph-books', loadBookManagement);
    }

    // Admin Only routes
    if (currentUser.role === 'Admin') {
        addNavItem('Manage Books', 'ph-bookmark-simple', loadBookManagement);
        addNavItem('User Management', 'ph-users', loadUserManagement);
        addNavItem('Reports', 'ph-chart-bar', loadReports);
    }
}

function addNavItem(text, iconClass, callback, isActive = false) {
    const btn = document.createElement('button');
    btn.className = `nav-item ${isActive ? 'active' : ''}`;
    btn.innerHTML = `<i class="ph ${iconClass}"></i> ${text}`;

    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        btn.classList.add('active');
        currentPageTitle.textContent = text;
        callback();
    });

    sidebarNav.appendChild(btn);
}

// --- Page Loaders (Stubs for full implementation next) ---

function loadDashboard() {
    currentPageTitle.textContent = 'Dashboard';
    if (currentUser.role === 'Member') {
        dynamicContent.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon"><i class="ph ph-books"></i></div>
                    <div class="stat-info">
                        <h3>Welcome to Savant</h3>
                        <p>Browse our catalog to find your next great read.</p>
                    </div>
                </div>
            </div>
            <div class="page" id="member-overview">
                 <h3>Recent Activity</h3>
                 <p class="text-secondary mt-2">Loading your activity...</p>
                 <!-- We will fetch mini history here -->
            </div>
        `;
        // Fetch recent history
        fetchAndRenderMiniHistory();
    } else {
        dynamicContent.innerHTML = `
            <div class="page" id="admin-overview">
                 <h3>Recent System Activity</h3>
                 <p class="text-secondary mt-2">Loading activity...</p>
                 <!-- We will fetch global history here -->
            </div>
        `;
        setTimeout(fetchAndRenderGlobalHistory, 50);
    }
}

async function fetchAndRenderGlobalHistory() {
    try {
        const res = await fetch(`${API_URL}/transactions/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        const container = document.getElementById('admin-overview');

        if (data.length === 0) {
            container.innerHTML = `<h3>Recent System Activity</h3><p class="text-secondary mt-2">No transactions found.</p>`;
            return;
        }

        let tableHTML = `
            <div class="table-container mt-4">
                <table>
                    <thead>
                        <tr>
                            <th>Tx ID</th>
                            <th>Member</th>
                            <th>Book</th>
                            <th>Status</th>
                            <th>Issue/Due</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        data.forEach(tx => {
            const statusClass = tx.TransactionStatus === 'Returned' ? 'success' : 'warning';
            tableHTML += `
                <tr>
                    <td><strong>#${tx.ID}</strong></td>
                    <td><strong>${tx.MemberName}</strong><br><small class="text-tertiary">${tx.MemberEmail}</small></td>
                    <td><strong>${tx.Title}</strong><br><small class="text-tertiary">${tx.Author}</small></td>
                    <td><span class="badge ${statusClass}">${tx.TransactionStatus}</span></td>
                    <td><small>Iss: ${new Date(tx.IssueDate).toLocaleDateString()}</small><br><small>Due: ${new Date(tx.DueDate).toLocaleDateString()}</small></td>
                </tr>
             `;
        });

        tableHTML += `</tbody></table></div>`;

        container.innerHTML = `<h3>Recent System Activity</h3>` + tableHTML;

    } catch (e) {
        console.error(e);
        const container = document.getElementById('admin-overview');
        if (container) container.innerHTML = `<h3>Recent System Activity</h3><p class="text-secondary mt-2">Error loading activity.</p>`;
    }
}

async function fetchAndRenderMiniHistory() {
    try {
        const res = await fetch(`${API_URL}/transactions/history/${currentUser.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        const container = document.getElementById('member-overview');

        if (data.length === 0) {
            container.innerHTML += `<p class="text-secondary">No transactions found.</p>`;
            return;
        }

        let tableHTML = `
            <div class="table-container mt-4">
                <table>
                    <thead>
                        <tr>
                            <th>Tx ID</th>
                            <th>Book</th>
                            <th>Status</th>
                            <th>Due Date</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        data.slice(0, 5).forEach(tx => {
            const statusClass = tx.TransactionStatus === 'Returned' ? 'success' : 'warning';
            tableHTML += `
                <tr>
                    <td><strong>#${tx.ID}</strong></td>
                    <td><strong>${tx.Title}</strong><br><small class="text-tertiary">${tx.Author}</small></td>
                    <td><span class="badge ${statusClass}">${tx.TransactionStatus}</span></td>
                    <td>${new Date(tx.DueDate).toLocaleDateString()}</td>
                </tr>
             `;
        });

        tableHTML += `</tbody></table></div>`;

        // Remove loading
        container.innerHTML = `<h3>Recent Activity</h3>` + tableHTML;

        // Check for fines
        const pendingFines = data.filter(tx => tx.FineStatus === 'Pending');
        if (pendingFines.length > 0) {
            const totalFine = pendingFines.reduce((sum, tx) => sum + parseFloat(tx.FineAmount), 0);
            showToast(`Warning: You have ₹${totalFine} in pending fines. You cannot issue new books.`, 'error');
        }

    } catch (e) {
        console.error(e);
    }
}

// Stubs for next task (implementing full views)
function loadCatalog() {
    dynamicContent.innerHTML = `<div class="page"><h3>Loading Catalog...</h3></div>`;
    renderCatalogView();
}

function loadMemberHistory(id) {
    dynamicContent.innerHTML = `<div class="page"><h3>Loading History...</h3></div>`;
    renderHistoryView(id);
}

function loadCirculation() {
    dynamicContent.innerHTML = `<div class="page"><h3>Circulation Desk...</h3></div>`;
    renderCirculationView();
}

function loadBookManagement() {
    dynamicContent.innerHTML = `<div class="page"><h3>Manage Books...</h3></div>`;
    renderBookManagerView();
}

function loadChangePassword() {
    dynamicContent.innerHTML = `<div class="page"><h3>Change Password...</h3></div>`;
    renderChangePasswordView();
}

async function loadReports() {
     dynamicContent.innerHTML = `<div class="page"><h3>Loading Reports...</h3></div>`;
     try {
        const res = await fetch(`${API_URL}/reports/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const stats = await res.json();
        
        dynamicContent.innerHTML = `
            <div class="page text-center">
                 <h3 style="margin-bottom: 2rem;">Library Operations Overview</h3>
                 
                 <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                     <div class="stat-card" style="flex-direction: column; text-align: center; gap: 1rem;">
                         <div class="stat-icon" style="margin: 0 auto; background: rgba(59, 130, 246, 0.1); color: var(--primary);"><i class="ph ph-books"></i></div>
                         <div>
                             <h4 class="text-secondary">Total Books in Stock</h4>
                             <h2 style="font-size: 2.5rem; margin-top: 0.5rem;">${stats.totalBooks}</h2>
                         </div>
                     </div>
                     
                     <div class="stat-card" style="flex-direction: column; text-align: center; gap: 1rem;">
                         <div class="stat-icon" style="margin: 0 auto; background: rgba(16, 185, 129, 0.1); color: var(--success);"><i class="ph ph-users"></i></div>
                         <div>
                             <h4 class="text-secondary">Registered Members</h4>
                             <h2 style="font-size: 2.5rem; margin-top: 0.5rem;">${stats.totalMembers}</h2>
                         </div>
                     </div>
                     
                     <div class="stat-card" style="flex-direction: column; text-align: center; gap: 1rem;">
                         <div class="stat-icon" style="margin: 0 auto; background: rgba(245, 158, 11, 0.1); color: var(--warning);"><i class="ph ph-arrows-left-right"></i></div>
                         <div>
                             <h4 class="text-secondary">Books Currently Issued</h4>
                             <h2 style="font-size: 2.5rem; margin-top: 0.5rem;">${stats.activeIssues}</h2>
                         </div>
                     </div>
                     
                     <div class="stat-card" style="flex-direction: column; text-align: center; gap: 1rem;">
                         <div class="stat-icon" style="margin: 0 auto; background: rgba(239, 68, 68, 0.1); color: var(--danger);"><i class="ph ph-money"></i></div>
                         <div>
                             <h4 class="text-secondary">Total Pending Fines</h4>
                             <h2 style="font-size: 2.5rem; margin-top: 0.5rem;">₹${stats.totalPendingFines}</h2>
                         </div>
                     </div>
                 </div>
            </div>
        `;
     } catch (err) {
         console.error(err);
         dynamicContent.innerHTML = `<div class="page"><p class="text-danger">Failed to load library statistics.</p></div>`;
     }
}

function loadUserManagement() {
    dynamicContent.innerHTML = `<div class="page"><h3>User Management...</h3></div>`;
    renderUserManagerView();
}

// --- Utilities ---
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ph-info';
    if (type === 'success') icon = 'ph-check-circle';
    if (type === 'error') icon = 'ph-warning-circle';

    toast.innerHTML = `<i class="ph ${icon}"></i> <span>${message}</span>`;

    const container = document.getElementById('toast-container');
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function startClock() {
    const clockEl = document.getElementById('live-clock');
    setInterval(() => {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, 1000);
}

// We will add the view render functions in app-views.js (or append here) in the next step.
