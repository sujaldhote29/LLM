require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcrypt');

async function seedLibrarian() {
    try {
        console.log("Seeding staff accounts...");
        
        // 1. Admin account
        const [existingAdmins] = await db.query('SELECT * FROM Members WHERE Email = ?', ['admin@library.com']);
        if (existingAdmins.length === 0) {
            const adminPassword = await bcrypt.hash('password123', 10);
            await db.query(
                'INSERT INTO Members (Name, Email, Phone, Role, Password) VALUES (?, ?, ?, ?, ?)',
                ['System Admin', 'admin@library.com', '1234567890', 'Admin', adminPassword]
            );
            console.log("Added Admin: admin@library.com");
        } else {
            console.log("Admin already exists, skipping.");
        }

        // 2. Librarian account
        const [existingLibrarians] = await db.query('SELECT * FROM Members WHERE Email = ?', ['librarian@library.com']);
        if (existingLibrarians.length === 0) {
            const librarianPassword = await bcrypt.hash('password123', 10);
            await db.query(
                'INSERT INTO Members (Name, Email, Phone, Role, Password) VALUES (?, ?, ?, ?, ?)',
                ['Librarian Jane', 'librarian@library.com', '0987654321', 'Librarian', librarianPassword]
            );
            console.log("Added Librarian: librarian@library.com");
        } else {
            console.log("Librarian already exists, skipping.");
        }

        console.log("Done inserting staff.");
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        process.exit();
    }
}

seedLibrarian();
