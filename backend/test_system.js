const http = require('http');

const API_URL = 'http://localhost:5000/api';

async function fetchAPI(endpoint, method = 'GET', body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_URL + endpoint);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {}
        };

        if (token) options.headers['Authorization'] = `Bearer ${token}`;
        if (body) {
            options.headers['Content-Type'] = 'application/json';
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = data;
                try { parsed = JSON.parse(data); } catch (e) {}
                resolve({ status: res.statusCode, data: parsed });
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    console.log("=========================================");
    console.log("🚀 STARTING COMPREHENSIVE SYSTEM TESTS");
    console.log("=========================================\n");

    let adminToken, librarianToken, memberToken;
    let testBookId, testMemberId, testTransactionId;

    try {
        // --- 1. Authenticaton Tests ---
        console.log("--- 1. Auth & Token Generation ---");
        // Login Admin
        let res = await fetchAPI('/auth/login', 'POST', { email: 'admin@library.com', password: 'password123' });
        if (res.status === 200) {
            adminToken = res.data.token;
            console.log("✅ Admin Login Successful");
        } else throw new Error("Admin login failed");

        // Login Librarian
        res = await fetchAPI('/auth/login', 'POST', { email: 'librarian@library.com', password: 'password123' });
        if (res.status === 200) {
            librarianToken = res.data.token;
            console.log("✅ Librarian Login Successful");
        } else throw new Error("Librarian login failed");

        // Create a temporary Member
        const testMemberEmail = `testuser_${Date.now()}@example.com`;
        res = await fetchAPI('/auth/register', 'POST', { name: 'Test Member', email: testMemberEmail, password: 'password123' });
        if (res.status === 201 || res.status === 200) {
            console.log("✅ Member Regisration Successful");
        } else throw new Error("Member registration failed");

        res = await fetchAPI('/auth/login', 'POST', { email: testMemberEmail, password: 'password123' });
        if (res.status === 200) {
            memberToken = res.data.token;
            testMemberId = res.data.user.id;
            console.log("✅ Member Login Successful");
        } else throw new Error("Member login failed");
        
        console.log("\n--- 2. Role Authorization Tests ---");
        
        // Librarian tries to get reports (Admin only)
        res = await fetchAPI('/reports/stats', 'GET', null, librarianToken);
        if (res.status === 403) console.log("✅ Shield: Librarian correctly blocked from Reports");
        else throw new Error(`Librarian not blocked from reports! Got ${res.status}`);

        // Member tries to see active transactions (Librarian/Admin only)
        res = await fetchAPI('/transactions/all', 'GET', null, memberToken);
        if (res.status === 403) console.log("✅ Shield: Member correctly blocked from All Transactions");
        else throw new Error("Member not blocked from transactions!");

        console.log("\n--- 3. Book Management (Admin) ---");
        
        // Admin adds a book
        const bookPayload = { title: "Test Book", author: "Test Author", isbn: "123456789", category: "Test", stock: 1 };
        res = await fetchAPI('/books', 'POST', bookPayload, adminToken);
        if (res.status === 201) {
            console.log("✅ Admin successfully added a new book");
            testBookId = res.data.bookId;
        } else throw new Error("Admin could not add book");

        // Librarian tries to add a book (Should Fail)
        res = await fetchAPI('/books', 'POST', bookPayload, librarianToken);
        if (res.status === 403) console.log("✅ Shield: Librarian correctly blocked from Adding Books");
        else throw new Error("Librarian was able to add a book!");

        console.log("\n--- 4. Circulation & Inventory Tests ---");
        
        // Librarian issues the book to the Member
        const issueDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14); // 14 days
        
        res = await fetchAPI('/transactions/issue', 'POST', {
            memberId: testMemberId,
            bookId: testBookId,
            dueDate: dueDate.toISOString().split('T')[0]
        }, librarianToken);

        if (res.status === 201) {
            testTransactionId = res.data.transactionId;
            console.log(`✅ Librarian successfully issued Book #${testBookId} to Member #${testMemberId} (Tx ID: ${testTransactionId})`);
        } else throw new Error(`Book issue failed: ${res.data.message}`);

        // Verify Stock Deducted
        res = await fetchAPI(`/books/public`, 'GET');
        const updatedBook = res.data.find(b => b.ID === testBookId);
        if (updatedBook && updatedBook.Stock === 0) {
            console.log("✅ Inventory correctly deducted (Stock is 0)");
        } else throw new Error("Inventory was not deducted correctly upon issue!");

        // Try to issue it again (Should fail since stock is 0)
        res = await fetchAPI('/transactions/issue', 'POST', {
            memberId: testMemberId,
            bookId: testBookId,
            dueDate: dueDate.toISOString().split('T')[0]
        }, librarianToken);
        if (res.status === 400 && res.data.message.includes("out of stock")) {
             console.log("✅ Guard: System correctly blocked issuing out-of-stock book");
        } else throw new Error("System allowed issuing an out of stock book!");

        console.log("\n--- 5. Return & Fine Validation ---");
        
        // Return book
        res = await fetchAPI('/transactions/return', 'POST', { transactionId: testTransactionId }, librarianToken);
        if (res.status === 200) {
            console.log(`✅ Librarian successfully received book return (Tx ID: ${testTransactionId})`);
        } else throw new Error(`Return failed: ${res.data.message}`);

        // Verify Stock Added Back
        res = await fetchAPI(`/books/public`, 'GET');
        const returnedBook = res.data.find(b => b.ID === testBookId);
        if (returnedBook && returnedBook.Stock === 1) {
            console.log("✅ Inventory correctly restocked after return (Stock is 1)");
        } else throw new Error("Inventory was not restocked correctly upon return!");


        console.log("\n=========================================");
        console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉");
        console.log("=========================================\n");

    } catch (err) {
        console.error("\n❌ TEST FAILED: ", err.message);
        process.exit(1);
    }
}

runTests();
