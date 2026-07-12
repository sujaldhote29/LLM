const db = require('./db');

async function testDelete() {
    try {
        // Let's create a temporary member first
        const [regResult] = await db.query(
            'INSERT INTO Members (Name, Email, Password, Role) VALUES (?, ?, ?, ?)',
            ['Temp Delete Test', 'temp_delete@example.com', 'password123', 'Member']
        );
        const tempId = regResult.insertId;
        console.log(`Created temporary user with ID: ${tempId}`);
        
        // Let's simulate a transaction and fine to verify cascade delete works
        const [bookResult] = await db.query('SELECT ID FROM Books LIMIT 1');
        if (bookResult.length > 0) {
            const bookId = bookResult[0].ID;
            const [txResult] = await db.query(
                'INSERT INTO Transactions (MemberID, BookID, IssueDate, DueDate, Status) VALUES (?, ?, ?, ?, ?)',
                [tempId, bookId, new Date(), new Date(), 'Issued']
            );
            const txId = txResult.insertId;
            console.log(`Created temporary transaction with ID: ${txId} for user ${tempId}`);

            await db.query(
                'INSERT INTO Fines (TransactionID, Amount, Status) VALUES (?, ?, ?)',
                [txId, 10.00, 'Pending']
            );
            console.log(`Created temporary fine for transaction ${txId}`);
        }

        // Now let's try deleting the user
        console.log(`Attempting to delete user ${tempId}...`);
        const [delResult] = await db.query('DELETE FROM Members WHERE ID = ?', [tempId]);
        console.log("Delete result:", delResult);
        console.log("Cascade delete worked successfully!");

    } catch (err) {
        console.error("Error during deletion test:", err);
    } finally {
        process.exit();
    }
}

testDelete();
