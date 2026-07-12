const db = require('./db');

async function listUsers() {
    try {
        const [users] = await db.query('SELECT ID, Name, Email, Phone, Role, Password FROM Members');
        console.log("\n=================== REGISTERED USERS ===================");
        console.table(users);
        console.log(`Total users found: ${users.length}\n`);
    } catch (err) {
        console.error("Error retrieving users from database:", err);
    } finally {
        process.exit();
    }
}

listUsers();
