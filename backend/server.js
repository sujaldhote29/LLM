require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Import Routes
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const transactionRoutes = require('./routes/transactions');
const userRoutes = require('./routes/users');
const reportRoutes = require('./routes/reports');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
// Serve static frontend files
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

// Basic API status route
app.get('/api-status', (req, res) => {
    res.send('Library Management System API is running...');
});

// Fallback to frontend index.html (Express 5 compatible RegExp)
app.get(/^(?!\/api).*$/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
