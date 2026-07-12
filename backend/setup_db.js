require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');

async function setup() {
    try {
        // Connect without database selected first
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true
        });

        const schema = fs.readFileSync('./schema.sql', 'utf8');
        
        console.log("Running schema...");
        await connection.query(schema);
        console.log("Database and tables created successfully!");

        await connection.end();
    } catch (err) {
        console.error("Error setting up database:", err);
    }
}

setup();
