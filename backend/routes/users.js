const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRole } = require('./auth');
const bcrypt = require('bcrypt');

// Get all users (Admin and Librarian)
router.get('/', authenticateToken, authorizeRole(['Admin', 'Librarian']), async (req, res) => {
    try {
        const [users] = await db.query('SELECT ID, Name, Email, Phone, Role FROM Members ORDER BY ID DESC');
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching users' });
    }
});

// Update user role (Admin only)
router.put('/:id/role', authenticateToken, authorizeRole(['Admin']), async (req, res) => {
    try {
        const { role } = req.body;
        if (!['Admin', 'Librarian', 'Member'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }
        
        await db.query('UPDATE Members SET Role = ? WHERE ID = ?', [role, req.params.id]);
        res.json({ message: 'Role updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating role' });
    }
});

// Delete user (Admin only)
router.delete('/:id', authenticateToken, authorizeRole(['Admin']), async (req, res) => {
    try {
        await db.query('DELETE FROM Members WHERE ID = ?', [req.params.id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting user' });
    }
});

// Reports: Popular Books
router.get('/reports/popular-books', authenticateToken, authorizeRole(['Admin', 'Librarian']), async (req, res) => {
    try {
        const [popularBooks] = await db.query(`
            SELECT b.ID, b.Title, b.Author, COUNT(t.ID) as IssueCount
            FROM Books b
            JOIN Transactions t ON b.ID = t.BookID
            GROUP BY b.ID
            ORDER BY IssueCount DESC
            LIMIT 10
        `);
        res.json(popularBooks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching popular books' });
    }
});

// Reports: Overdue Books
router.get('/reports/overdue-books', authenticateToken, authorizeRole(['Admin', 'Librarian']), async (req, res) => {
    try {
        const currentDate = new Date().toISOString().split('T')[0];
        
        const [overdueBooks] = await db.query(`
            SELECT t.ID as TransactionID, m.Name as MemberName, m.Email, b.Title as BookTitle, t.DueDate
            FROM Transactions t
            JOIN Members m ON t.MemberID = m.ID
            JOIN Books b ON t.BookID = b.ID
            WHERE t.Status = 'Issued' AND t.DueDate < ?
            ORDER BY t.DueDate ASC
        `, [currentDate]);
        
        res.json(overdueBooks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching overdue books' });
    }
});



// Complete payment of fine (Librarian only)
router.post('/pay-fine/:transactionId', authenticateToken, authorizeRole(['Librarian']), async (req, res) => {
    try {
        const transactionId = req.params.transactionId;
        
        const [fines] = await db.query('SELECT * FROM Fines WHERE TransactionID = ? AND Status = "Pending"', [transactionId]);
        
        if (fines.length === 0) {
            return res.status(404).json({ message: 'No pending fines for this transaction' });
        }
        
        await db.query('UPDATE Fines SET Status = "Paid" WHERE TransactionID = ?', [transactionId]);
        
        res.json({ message: 'Fine paid successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating fine status' });
    }
});

// Change own password (All authenticated users)
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }

        // Fetch user password hash
        const [users] = await db.query('SELECT Password FROM Members WHERE ID = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];

        // Check if current password is correct
        const match = await bcrypt.compare(currentPassword, user.Password);
        if (!match) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        // Hash and save the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE Members SET Password = ? WHERE ID = ?', [hashedPassword, req.user.id]);

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating password' });
    }
});

// Reset another user's password (Admin only)
router.post('/:id/reset-password', authenticateToken, authorizeRole(['Admin']), async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword) {
            return res.status(400).json({ message: 'New password is required' });
        }

        // Hash and save the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const [result] = await db.query('UPDATE Members SET Password = ? WHERE ID = ?', [hashedPassword, req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error resetting password' });
    }
});

module.exports = router;
