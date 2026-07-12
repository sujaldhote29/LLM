const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRole } = require('./auth');

// Issue a Book (Librarian only)
router.post('/issue', authenticateToken, authorizeRole(['Librarian']), async (req, res) => {
    try {
        const { memberId, bookId, dueDate } = req.body;

        if (!memberId || !bookId || !dueDate) {
            return res.status(400).json({ message: 'MemberID, BookID, and DueDate are required' });
        }

        // 1. Check if member has pending fines
        const [fines] = await db.query(
            'SELECT * FROM Fines JOIN Transactions ON Fines.TransactionID = Transactions.ID WHERE Transactions.MemberID = ? AND Fines.Status = "Pending"',
            [memberId]
        );

        if (fines.length > 0) {
            return res.status(403).json({ message: 'Cannot issue book. Member has pending fines.', fines });
        }

        // 2. Check book stock
        const [books] = await db.query('SELECT Stock FROM Books WHERE ID = ?', [bookId]);
        
        if (books.length === 0) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        if (books[0].Stock <= 0) {
            return res.status(400).json({ message: 'Book is out of stock' });
        }

        // 3. Issue the book (Transaction start)
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const issueDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            
            // Insert transaction
            const [transResult] = await connection.query(
                'INSERT INTO Transactions (MemberID, BookID, IssueDate, DueDate, Status) VALUES (?, ?, ?, ?, "Issued")',
                [memberId, bookId, issueDate, dueDate]
            );

            // Decrease stock
            await connection.query('UPDATE Books SET Stock = Stock - 1 WHERE ID = ?', [bookId]);

            await connection.commit();
            res.status(201).json({ message: 'Book issued successfully', transactionId: transResult.insertId });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during book issue' });
    }
});


// Return a Book (Librarian only)
router.post('/return', authenticateToken, authorizeRole(['Librarian']), async (req, res) => {
    try {
        const { transactionId } = req.body;

        if (!transactionId) {
            return res.status(400).json({ message: 'TransactionID is required' });
        }

        // Get transaction
        const [transactions] = await db.query('SELECT * FROM Transactions WHERE ID = ?', [transactionId]);
        if (transactions.length === 0) return res.status(404).json({ message: 'Transaction not found' });

        const transaction = transactions[0];

        if (transaction.Status === 'Returned') {
            return res.status(400).json({ message: 'Book is already returned' });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const returnDateStr = new Date().toISOString().split('T')[0]; // Current date
            
            // Calculate fines
            const dueDate = new Date(transaction.DueDate);
            const returnDate = new Date(returnDateStr);
            const diffTime = Math.max(returnDate - dueDate, 0); // No negative difference
            const daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            let fineAmount = 0;
            if (daysLate > 0) {
                fineAmount = daysLate * 5; // ₹5 per day late
            }

            // Update transaction to returned
            await connection.query(
                'UPDATE Transactions SET Status = "Returned", ReturnDate = ? WHERE ID = ?',
                [returnDateStr, transactionId]
            );

            // Increase stock
            await connection.query('UPDATE Books SET Stock = Stock + 1 WHERE ID = ?', [transaction.BookID]);

            // Add fine if applicable
            if (fineAmount > 0) {
                await connection.query(
                    'INSERT INTO Fines (TransactionID, Amount, Status) VALUES (?, ?, "Pending")',
                    [transactionId, fineAmount]
                );
            }

            await connection.commit();
            res.json({ message: `Book returned successfully. ${fineAmount > 0 ? `Late fine generated: ₹${fineAmount}` : 'No fines.'}` });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during book return' });
    }
});



// Get all recent transactions (Admin/Librarian)
router.get('/all', authenticateToken, authorizeRole(['Admin', 'Librarian']), async (req, res) => {
    try {
        const [history] = await db.query(`
            SELECT t.ID, t.IssueDate, t.DueDate, t.ReturnDate, t.Status as TransactionStatus, 
                   b.Title, b.Author, 
                   m.Name as MemberName, m.Email as MemberEmail
            FROM Transactions t
            JOIN Books b ON t.BookID = b.ID
            JOIN Members m ON t.MemberID = m.ID
            ORDER BY t.ID DESC
            LIMIT 20
        `);

        res.json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching all transactions' });
    }
});

// Get member history and active issues (For members to view themselves, or Staff to view anyone)
router.get('/history/:memberId', authenticateToken, async (req, res) => {
    try {
        const memberId = req.params.memberId;

        // Members can only see their own history, Admins/Librarians can see anyone's
        if (req.user.role === 'Member' && req.user.id !== parseInt(memberId)) {
             return res.status(403).json({ message: 'Forbidden' });
        }

        const [history] = await db.query(`
            SELECT t.ID, t.IssueDate, t.DueDate, t.ReturnDate, t.Status as TransactionStatus, 
                   b.Title, b.Author, 
                   f.Amount as FineAmount, f.Status as FineStatus
            FROM Transactions t
            JOIN Books b ON t.BookID = b.ID
            LEFT JOIN Fines f ON t.ID = f.TransactionID
            WHERE t.MemberID = ?
            ORDER BY t.ID DESC
        `, [memberId]);

        res.json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching transaction history' });
    }
});

module.exports = router;
