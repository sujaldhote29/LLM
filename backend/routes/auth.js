const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Middleware to verify JWT token and checking Roles
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
        }
        next();
    };
};

// User Registration (Admin only for staff, or public for Member depending on requirements, assuming public for Members for simplicity but admins can create any)
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, role, password } = req.body;
        
        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        const assignRole = role || 'Member';

        // Check if user exists
        const [existingUsers] = await db.query('SELECT * FROM Members WHERE Email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const [result] = await db.query(
            'INSERT INTO Members (Name, Email, Phone, Role, Password) VALUES (?, ?, ?, ?, ?)',
            [name, email, phone, assignRole, hashedPassword]
        );

        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during registration', error: error.message, stack: error.stack });
    }
});

// User Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user
        const [users] = await db.query('SELECT * FROM Members WHERE Email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];

        // Check password
        const validPassword = await bcrypt.compare(password, user.Password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign(
            { id: user.ID, email: user.Email, role: user.Role },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Logged in successfully',
            token,
            user: { id: user.ID, name: user.Name, email: user.Email, role: user.Role }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Forgot Password reset (Public)
router.post('/forgot-password', async (req, res) => {
    try {
        const { email, phone, newPassword } = req.body;
        if (!email || !phone || !newPassword) {
            return res.status(400).json({ message: 'Email, registered phone number, and new password are required' });
        }

        // Find user by both email and phone
        const [users] = await db.query('SELECT ID FROM Members WHERE Email = ? AND Phone = ?', [email, phone]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Invalid credentials: user details do not match' });
        }

        const user = users[0];

        // Hash and save the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE Members SET Password = ? WHERE ID = ?', [hashedPassword, user.ID]);

        res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;
module.exports.authorizeRole = authorizeRole;
