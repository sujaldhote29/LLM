// --- Views and Helpers ---

// 1. Catalog View
async function renderCatalogView() {
    let html = `
        <div class="page">
            <div class="action-bar flex-wrap">
                <div class="search-bar">
                    <i class="ph ph-magnifying-glass"></i>
                    <input type="text" id="catalog-search" placeholder="Search by Title, Author, or ISBN...">
                </div>
            </div>
            <div id="catalog-results" class="stats-grid">
                <!-- Books injected here -->
            </div>
        </div>
    `;
    dynamicContent.innerHTML = html;

    const searchInput = document.getElementById('catalog-search');
    
    // Initial Load
    fetchAndDisplayBooks();

    // Debounce search
    let timeout = null;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            fetchAndDisplayBooks(e.target.value);
        }, 300);
    });
}

async function fetchAndDisplayBooks(query = '') {
    const resultsContainer = document.getElementById('catalog-results');
    resultsContainer.innerHTML = '<p class="text-tertiary">Loading books...</p>';
    
    try {
        const url = query ? `${API_URL}/books?search=${encodeURIComponent(query)}` : `${API_URL}/books`;
        const res = await fetch(url, {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to fetch books');
        
        const books = await res.json();
        
        if (books.length === 0) {
            resultsContainer.innerHTML = '<p class="text-tertiary">No books found matching your criteria.</p>';
            return;
        }

        let booksHTML = '';
        books.forEach(book => {
            const stockStatus = book.Stock > 0 
                ? `<span class="badge success">Available (${book.Stock})</span>` 
                : `<span class="badge danger">Out of Stock</span>`;
            
            booksHTML += `
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
        
        resultsContainer.innerHTML = booksHTML;

    } catch (err) {
        console.error(err);
        resultsContainer.innerHTML = '<p class="text-danger">Error loading books.</p>';
        showToast('Error loading catalog', 'error');
    }
}


// 2. Member History View
async function renderHistoryView(memberId) {
     const resultsContainer = document.createElement('div');
     resultsContainer.className = 'page';
     resultsContainer.innerHTML = '<h3>Transaction History & Fines</h3><p class="text-tertiary mt-4">Loading your records...</p>';
     dynamicContent.innerHTML = '';
     dynamicContent.appendChild(resultsContainer);
     
     try {
        const res = await fetch(`${API_URL}/transactions/history/${memberId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if(!res.ok) throw new Error("Failed to fetch history");

        const history = await res.json();

        if (history.length === 0) {
            resultsContainer.innerHTML = `
               <h3>Transaction History</h3>
               <div class="table-container mt-4 p-4 text-center">
                   <i class="ph ph-books" style="font-size: 3rem; color: var(--text-tertiary);"></i>
                   <p class="text-secondary mt-2">You haven't issued any books yet.</p>
               </div>
            `;
            return;
        }

        let hasPendingFines = false;

        let tableHTML = `
            <div class="table-container mt-4">
                <table>
                    <thead>
                        <tr>
                            <th>Tx ID</th>
                            <th>Book Details</th>
                            <th>Dates</th>
                            <th>Status</th>
                            <th>Fines</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        history.forEach((tx, index) => {
             const statusClass = tx.TransactionStatus === 'Returned' ? 'success' : 'warning';
             
             let fineDisplay = '<span class="text-tertiary">-</span>';
             if (tx.FineAmount) {
                  if (tx.FineStatus === 'Pending') {
                      hasPendingFines = true;
                      fineDisplay = `<span class="badge danger">Pending: ₹${tx.FineAmount}</span>`;
                  } else {
                      fineDisplay = `<span class="badge success">Paid: ₹${tx.FineAmount}</span>`;
                  }
             }

             tableHTML += `
                <tr>
                    <td><strong>#${tx.ID}</strong></td>
                    <td>
                        <strong>${tx.Title}</strong><br>
                        <small class="text-secondary">${tx.Author}</small>
                    </td>
                    <td>
                         <small class="text-secondary">Issued: ${new Date(tx.IssueDate).toLocaleDateString()}</small><br>
                         <small class="text-secondary">Due: ${new Date(tx.DueDate).toLocaleDateString()}</small>
                         ${tx.ReturnDate ? `<br><small class="text-secondary">Ret: ${new Date(tx.ReturnDate).toLocaleDateString()}</small>` : ''}
                    </td>
                    <td><span class="badge ${statusClass}">${tx.TransactionStatus}</span></td>
                    <td>${fineDisplay}</td>
                </tr>
             `;
        });

        tableHTML += `</tbody></table></div>`;
        
        let headerHTML = `<h3>Transaction History</h3>`;
        if (hasPendingFines) {
             headerHTML += `<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--danger); padding: 1rem; border-radius: var(--border-radius); margin-top: 1rem; color: var(--danger);">
                 <i class="ph ph-warning-circle"></i> <strong>Account Blocked:</strong> You have pending fines. Please visit the Librarian to clear your dues before issuing new books.
             </div>`;
        }

        resultsContainer.innerHTML = headerHTML + tableHTML;

     } catch(e) {
         console.error(e);
         resultsContainer.innerHTML = '<h3>Transaction History</h3><p class="text-danger mt-4">Failed to load history.</p>';
         showToast('Error fetching history', 'error');
     }
}


// 3. Circulation Desk (Issue/Return)
async function renderCirculationView() {
    let html = `
        <div class="page" style="max-width: 800px; margin: 0 auto;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                
                <!-- Issue Book Form -->
                <div class="table-container" style="padding: 2rem;">
                    <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="ph ph-export text-primary"></i> Issue Book
                    </h3>
                    <form id="issue-form">
                        <div class="input-group">
                            <label>Member ID</label>
                            <input type="number" id="issue-member" placeholder="Enter Member ID" required>
                        </div>
                        <div class="input-group">
                            <label>Book ID</label>
                            <input type="number" id="issue-book" placeholder="Enter Book ID" required>
                        </div>
                        <div class="input-group">
                            <label>Due Date</label>
                            <input type="date" id="issue-date" required>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block mt-4">Issue Book</button>
                    </form>
                </div>

                <!-- Return Book Form -->
                <div class="table-container" style="padding: 2rem; border-color: rgba(16, 185, 129, 0.2);">
                     <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; color: var(--success);">
                        <i class="ph ph-import"></i> Receive Book Return
                    </h3>
                    <form id="return-form">
                        <div class="input-group">
                            <label>Transaction ID</label>
                            <input type="number" id="return-tx" placeholder="Enter Transaction ID" required>
                        </div>
                        <button type="submit" class="btn btn-secondary btn-block mt-4" style="background: rgba(16, 185, 129, 0.1); color: var(--success); border-color: var(--success);">
                            Process Return
                        </button>
                    </form>

                     <h3 style="margin-top: 3rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; color: var(--warning);">
                        <i class="ph ph-money"></i> Clear Fines
                    </h3>
                    <form id="fine-form">
                         <div class="input-group">
                            <label>Transaction ID</label>
                            <input type="number" id="fine-tx" placeholder="Enter Transaction ID" required>
                        </div>
                        <button type="submit" class="btn btn-secondary btn-block mt-4" style="background: rgba(245, 158, 11, 0.1); color: var(--warning); border-color: var(--warning);">
                            Mark Fine as Paid
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;
    dynamicContent.innerHTML = html;

    // Set default due date to 14 days from now
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 14);
    document.getElementById('issue-date').value = defaultDue.toISOString().split('T')[0];

    // Event Listeners
    document.getElementById('issue-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const memberId = document.getElementById('issue-member').value;
        const bookId = document.getElementById('issue-book').value;
        const dueDate = document.getElementById('issue-date').value;

        try {
            const res = await fetch(`${API_URL}/transactions/issue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ memberId, bookId, dueDate })
            });
            const data = await res.json();
            
            if (res.ok) {
                showToast(data.message, 'success');
                e.target.reset();
            } else {
                showToast(data.message, 'error');
                if(data.fines) console.log("Pending Fines Details", data.fines);
            }
        } catch (err) {
            console.error(err);
             showToast('Failed to issue book', 'error');
        }
    });

    document.getElementById('return-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const transactionId = document.getElementById('return-tx').value;
        try {
            const res = await fetch(`${API_URL}/transactions/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ transactionId })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
                e.target.reset();
            } else {
                 showToast(data.message, 'error');
            }
        } catch (err) {
            showToast('Failed to process return', 'error');
        }
    });

    document.getElementById('fine-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const transactionId = document.getElementById('fine-tx').value;
        try {
            const res = await fetch(`${API_URL}/users/pay-fine/${transactionId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
             if (res.ok) {
                showToast(data.message, 'success');
                e.target.reset();
             } else {
                 showToast(data.message, 'error');
             }
        } catch (err) {
             showToast('Failed to clear fine', 'error');
        }
    });
}


// 4. Manage Books View
async function renderBookManagerView() {
    let addFormHTML = '';
    
    if (currentUser.role === 'Admin') {
        addFormHTML = `
             <div class="action-bar flex-wrap">
                 <!-- Add Book Mini Form -->
                 <div class="table-container" style="flex: 1; min-width: 300px; padding: 1.5rem;">
                     <h3 style="margin-bottom: 1rem;">Add New Book</h3>
                     <form id="add-book-form" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                         <div class="input-group" style="margin-bottom: 0;">
                             <input type="text" id="add-title" placeholder="Book Title" required>
                         </div>
                         <div class="input-group" style="margin-bottom: 0;">
                             <input type="text" id="add-author" placeholder="Author Name" required>
                         </div>
                         <div class="input-group" style="margin-bottom: 0;">
                             <input type="text" id="add-isbn" placeholder="ISBN" required>
                         </div>
                         <div class="input-group" style="margin-bottom: 0;">
                              <input type="text" id="add-category" placeholder="Category">
                         </div>
                          <div class="input-group" style="margin-bottom: 0;">
                              <input type="number" id="add-stock" placeholder="Stock Qty" min="1" required>
                         </div>
                         <button type="submit" class="btn btn-primary" style="height: 48px;">Add to Catalog</button>
                     </form>
                 </div>
             </div>
        `;
    }

    dynamicContent.innerHTML = `
        <div class="page">
             ${addFormHTML}
             <div id="book-inventory">
                  <!-- Load table here -->
             </div>
        </div>
    `;

    if (currentUser.role === 'Admin') {
        document.getElementById('add-book-form').addEventListener('submit', async (e) => {
         e.preventDefault();
         const payload = {
             title: document.getElementById('add-title').value,
             author: document.getElementById('add-author').value,
             isbn: document.getElementById('add-isbn').value,
             category: document.getElementById('add-category').value,
             stock: parseInt(document.getElementById('add-stock').value)
         };

         try {
             const res = await fetch(`${API_URL}/books`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                 body: JSON.stringify(payload)
             });
             const data = await res.json();
             
             if(res.ok){
                 showToast('Book added successfully', 'success');
                 e.target.reset();
                 fetchInventoryList();
             } else {
                 showToast(data.message, 'error');
             }
         } catch(err) {
             showToast('Error adding book', 'error');
         }
        });
    }

    fetchInventoryList();
}

async function fetchInventoryList() {
     const invContainer = document.getElementById('book-inventory');
     invContainer.innerHTML = '<p class="text-tertiary">Loading inventory...</p>';
     try {
         const res = await fetch(`${API_URL}/books`, { headers: { 'Authorization': `Bearer ${token}` }});
         const books = await res.json();

        let tableHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Book ID</th>
                            <th>Details</th>
                            <th>ISBN</th>
                            <th>Stock</th>
                            ${currentUser.role === 'Admin' ? '<th>Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
         `;

         books.forEach((b, index) => {
              let actionCol = '';
              if (currentUser.role === 'Admin') {
                  actionCol = `
                    <td>
                        <button onclick="deleteBook(${b.ID})" class="btn-icon btn-danger" style="padding: 0.25rem 0.5rem;" title="Delete Book"><i class="ph ph-trash"></i></button>
                    </td>
                  `;
              }
              
              tableHTML += `
                 <tr>
                    <td><strong>${index + 1}</strong></td>
                    <td><small class="text-tertiary">#${b.ID}</small></td>
                    <td><strong>${b.Title}</strong><br><small class="text-secondary">${b.Author}</small></td>
                    <td>${b.ISBN}</td>
                    <td>${b.Stock}</td>
                    ${actionCol}
                 </tr>
              `;
         });
         
         invContainer.innerHTML = tableHTML + '</tbody></table></div>';
     } catch (e) {
          invContainer.innerHTML = '<p class="text-danger">Failed to load inventory.</p>';
     }
}

// Global scope action for inline onclick
window.deleteBook = async (id) => {
     if(!confirm('Are you sure you want to delete this book?')) return;
     try {
         const res = await fetch(`${API_URL}/books/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
         });
         if(res.ok) {
             showToast('Book deleted', 'success');
             fetchInventoryList();
         } else {
             const d = await res.json();
             showToast(d.message || 'Failed to delete', 'error');
         }
     } catch(e) {
         showToast('Server error', 'error');
     }
};


// 5. User Management & Reports
async function renderUserManagerView() {
    dynamicContent.innerHTML = `<div class="page" id="user-mgmt-container"><p class="text-tertiary">Loading users...</p></div>`;
    
    try {
        const res = await fetch(`${API_URL}/users`, { headers: { 'Authorization': `Bearer ${token}` }});
        const users = await res.json();

        let table = `<div class="table-container"><table><thead><tr><th>#</th><th>User ID</th><th>Name</th><th>Role</th><th>Contact</th><th>Actions</th></tr></thead><tbody>`;
        
        users.forEach((u, index) => {
             const roleColor = u.Role === 'Admin' ? 'danger' : (u.Role === 'Librarian' ? 'info' : 'success');
             table += `
                <tr>
                    <td><strong>${index + 1}</strong></td>
                    <td><small class="text-tertiary">#${u.ID}</small></td>
                    <td><strong>${u.Name}</strong></td>
                    <td><span class="badge ${roleColor}">${u.Role}</span></td>
                    <td><small>${u.Email}<br>${u.Phone || 'N/A'}</small></td>
                    <td>
                        <select onchange="updateRole(${u.ID}, this.value)" style="width: auto; padding: 0.25rem; font-size: 0.8rem;">
                            <option value="Member" ${u.Role === 'Member' ? 'selected' : ''}>Member</option>
                            <option value="Librarian" ${u.Role === 'Librarian' ? 'selected' : ''}>Librarian</option>
                            <option value="Admin" ${u.Role === 'Admin' ? 'selected' : ''}>Admin</option>
                        </select>
                         <button onclick="resetUserPassword(${u.ID}, '${u.Name}')" class="btn-icon btn-ghost ml-2" title="Reset Password"><i class="ph ph-key text-warning"></i></button>
                         <button onclick="deleteUser(${u.ID})" class="btn-icon btn-ghost ml-2" title="Delete User"><i class="ph ph-trash text-danger"></i></button>
                    </td>
                </tr>
             `;
        });
        
        document.getElementById('user-mgmt-container').innerHTML = `<h3>Manage Users & Staff</h3>` + table + `</tbody></table></div>`;
    } catch(e) {
         document.getElementById('user-mgmt-container').innerHTML = `<p class="text-danger">Failed to load users.</p>`;
    }
}

window.updateRole = async (id, role) => {
     try {
         const res = await fetch(`${API_URL}/users/${id}/role`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({role})
         });
         if(res.ok) showToast('Role updated', 'success');
     } catch(e) {
          showToast('Failed to update role', 'error');
     }
};

window.deleteUser = async (id) => {
    if(!confirm('Delete this user account permanently?')) return;
     try {
         const res = await fetch(`${API_URL}/users/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
         });
         if(res.ok) {
             showToast('User deleted', 'success');
             renderUserManagerView(); // reload
         }
     } catch(e) {
          showToast('Server error', 'error');
     }
};

// Replace app.js script tag in HTML to load multiple tags, or append this simply

window.resetUserPassword = async (id, name) => {
    const newPassword = prompt(`Enter new password for ${name}:`);
    if (newPassword === null) return; // user cancelled
    if (newPassword.trim() === '') {
        showToast('Password cannot be empty', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/users/${id}/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ newPassword })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`Password for ${name} reset successfully!`, 'success');
        } else {
            showToast(data.message || 'Failed to reset password', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Server error resetting password', 'error');
    }
};

function renderChangePasswordView() {
    dynamicContent.innerHTML = `
        <div class="page" style="max-width: 500px; margin: 0 auto;">
            <div class="table-container" style="padding: 2rem;">
                <h3 style="margin-bottom: 1.5rem;"><i class="ph ph-lock-key text-primary"></i> Change Your Password</h3>
                <form id="change-password-form">
                    <div class="input-group">
                        <label for="change-old-password">Current Password</label>
                        <div class="input-wrapper">
                            <i class="ph ph-lock"></i>
                            <input type="password" id="change-old-password" placeholder="••••••••" required>
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label for="change-new-password">New Password</label>
                        <div class="input-wrapper">
                            <i class="ph ph-lock-key"></i>
                            <input type="password" id="change-new-password" placeholder="••••••••" required>
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label for="change-confirm-password">Confirm New Password</label>
                        <div class="input-wrapper">
                            <i class="ph ph-lock-key"></i>
                            <input type="password" id="change-confirm-password" placeholder="••••••••" required>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-block mt-4">Update Password</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('change-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('change-old-password').value;
        const newPassword = document.getElementById('change-new-password').value;
        const confirmPassword = document.getElementById('change-confirm-password').value;

        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match', 'error');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/users/change-password`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await res.json();
            if (res.ok) {
                showToast('Password changed successfully!', 'success');
                e.target.reset();
            } else {
                showToast(data.message || 'Failed to change password', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Server error changing password', 'error');
        }
    });
}
