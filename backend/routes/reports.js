const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRole } = require('./auth');

// Get high-level system statistics (Admin Only)
router.get('/stats', authenticateToken, authorizeRole(['Admin']), async (req, res) => {
    try {
        // Query multiple tables for summary counts
        const [[{ totalBooks }]] = await db.query('SELECT SUM(Stock) as totalBooks FROM Books');
        const [[{ totalMembers }]] = await db.query('SELECT COUNT(*) as totalMembers FROM Members WHERE Role = "Member"');
        const [[{ activeIssues }]] = await db.query('SELECT COUNT(*) as activeIssues FROM Transactions WHERE Status = "Issued"');
        const [[{ pendingFines }]] = await db.query('SELECT SUM(Amount) as pendingFines FROM Fines WHERE Status = "Pending"');

        res.json({
            totalBooks: totalBooks || 0,
            totalMembers: totalMembers || 0,
            activeIssues: activeIssues || 0,
            totalPendingFines: pendingFines || 0
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching reports statistics' });
    }
});

module.exports = router;
