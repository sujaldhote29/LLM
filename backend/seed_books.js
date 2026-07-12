require('dotenv').config();
const db = require('./db');

const books = [
    { code: 'BCS-051', title: 'Introduction to Software Engineering', semester: '5th' },
    { code: 'BCS-053', title: 'Web Programming', semester: '5th' },
    { code: 'MCS-023', title: 'Intro to Database Management Systems', semester: '3rd' },
    { code: 'MCS-021', title: 'Data and File Structures', semester: '3rd' },
    { code: 'BCS-031', title: 'Programming in C++', semester: '3rd' },
    { code: 'MCS-014', title: 'Systems Analysis and Design', semester: '3rd' },
    { code: 'MCS-012', title: 'Computer Organization & Assembly Language', semester: '2nd' },
    { code: 'BCS-011', title: 'Computer Basics and PC Software', semester: '1st' },
    { code: 'BCS-012', title: 'Basic Mathematics', semester: '1st' },
    { code: 'BCSP-064', title: 'Project (Library Management System)', semester: '6th' }
];

async function seedBooks() {
    try {
        console.log("Seeding books...");
        for (const book of books) {
            // Check if book exists
            const [rows] = await db.query('SELECT * FROM Books WHERE ISBN = ?', [book.code]);
            if (rows.length === 0) {
                await db.query(
                    'INSERT INTO Books (Title, Author, ISBN, Category, Stock) VALUES (?, ?, ?, ?, ?)',
                    [book.title, 'IGNOU Curriculum', book.code, book.semester + ' Semester', 5]
                );
                console.log(`Added: ${book.title}`);
            } else {
                console.log(`Skipped (already exists): ${book.title}`);
            }
        }
        console.log("Done inserting books.");
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        process.exit();
    }
}

seedBooks();
