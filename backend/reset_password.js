require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcrypt');

async function resetPassword() {
    // Get command line arguments
    const args = process.argv.slice(2);
    const email = args[0];
    const newPassword = args[1];

    if (!email || !newPassword) {
        console.log("\nUsage: node reset_password.js <email> <new_password>");
        console.log("Example: node reset_password.js librarian@library.com password123\n");
        process.exit(0);
    }

    try {
        console.log(`Searching for user with email: ${email}...`);
        
        // 1. Check if user exists
        const [users] = await db.query('SELECT ID, Name FROM Members WHERE Email = ?', [email]);
        if (users.length === 0) {
            console.error(`Error: No user found with email "${email}"`);
            process.exit(1);
        }

        const user = users[0];
        console.log(`Found user: ${user.Name} (ID: ${user.ID})`);

        // 2. Hash new password
        console.log("Hashing new password...");
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // 3. Update password in database
        await db.query('UPDATE Members SET Password = ? WHERE ID = ?', [hashedNewPassword, user.ID]);
        
        console.log(`\nSuccess! Password for ${email} has been updated to: "${newPassword}"\n`);

    } catch (err) {
        console.error("Database error:", err);
    } finally {
        process.exit(0);
    }
}

resetPassword();
