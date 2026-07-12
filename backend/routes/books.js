const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRole } = require('./auth');

// Get all books publicly (Searchable) - No authentication required
router.get('/public', async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = 'SELECT * FROM Books WHERE 1=1';
        let queryParams = [];

        if (search) {
            query += ' AND (Title LIKE ? OR Author LIKE ? OR ISBN LIKE ?)';
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        if (category) {
            query += ' AND Category = ?';
            queryParams.push(category);
        }

        query += ' ORDER BY ID DESC';

        const [books] = await db.query(query, queryParams);
        res.json(books);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching public books' });
    }
});

// Get all books (Searchable by Title, Author, Category) - Public to authenticated users
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = 'SELECT * FROM Books WHERE 1=1';
        let queryParams = [];

        if (search) {
            query += ' AND (Title LIKE ? OR Author LIKE ? OR ISBN LIKE ?)';
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        if (category) {
            query += ' AND Category = ?';
            queryParams.push(category);
        }

        query += ' ORDER BY ID DESC';

        const [books] = await db.query(query, queryParams);
        res.json(books);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching books' });
    }
});

// Get single book by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [books] = await db.query('SELECT * FROM Books WHERE ID = ?', [req.params.id]);
        if (books.length === 0) return res.status(404).json({ message: 'Book not found' });
        res.json(books[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching book' });
    }
});

// Add a new book (Admin only)
router.post('/', authenticateToken, authorizeRole(['Admin']), async (req, res) => {
    try {
        const { title, author, isbn, category, stock } = req.body;
        
        if (!title || !author || !isbn) {
            return res.status(400).json({ message: 'Title, Author, and ISBN are required' });
        }

        const [result] = await db.query(
            'INSERT INTO Books (Title, Author, ISBN, Category, Stock) VALUES (?, ?, ?, ?, ?)',
            [title, author, isbn, category, stock || 0]
        );

        res.status(201).json({ message: 'Book added successfully', bookId: result.insertId });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Book with this ISBN already exists' });
        }
        res.status(500).json({ message: 'Server error adding book' });
    }
});

// Update a book (Admin only)
router.put('/:id', authenticateToken, authorizeRole(['Admin']), async (req, res) => {
    try {
        const { title, author, isbn, category, stock } = req.body;
        
        const [result] = await db.query(
            'UPDATE Books SET Title = ?, Author = ?, ISBN = ?, Category = ?, Stock = ? WHERE ID = ?',
            [title, author, isbn, category, stock, req.params.id]
        );

        if (result.affectedRows === 0) return res.status(404).json({ message: 'Book not found' });
        res.json({ message: 'Book updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating book' });
    }
});

// Delete a book (Admin only)
router.delete('/:id', authenticateToken, authorizeRole(['Admin']), async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM Books WHERE ID = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Book not found' });
        res.json({ message: 'Book deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting book' });
    }
});

module.exports = router;
