# Library Management System

A robust, full-stack Library Management System featuring a custom Single Page Application (SPA) frontend built with vanilla web technologies, and a secure REST API backend featuring Role-Based Access Control (RBAC).

## 🚀 Tech Stack

- **Frontend:** Vanilla HTML5, CSS3 (with custom variables for Light/Dark mode transitions), JavaScript.
- **Backend:** Node.js, Express (v5).
- **Database:** MySQL (using a promise-based connection pool via `mysql2`).
- **Security:** JSON Web Tokens (JWT) for session authentication, bcrypt for password hashing.

---

## 🛠️ Prerequisites

Before running this project, make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [MySQL Server](https://dev.mysql.com/downloads/installer/)

---

## 🏃‍♂️ Getting Started

Follow these step-by-step instructions to set up and run the project locally on your machine.

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd LLM


2. Configure Environment Variables
Navigate to the backend folder and look for the .env configuration. If it doesn't exist, create a .env file inside the backend/ directory:
cd backend

Open the .env file and add your database credentials and local server configuration:

PORT=3000
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=library_db
JWT_SECRET=your_super_secret_jwt_key

3. Install Dependencies
While inside the backend directory, run the following command to install the required Node.js packages:
npm install

4. Setup and Seed the Database
The project includes automated scripts to create the tables and populate initial mock data (including the default librarian and admin accounts).

Run the following scripts in order:
# 1. Create the database schema and tables
node setup_db.js

# 2. Seed the database with sample books
node seed_books.js

# 3. Seed the database with mock librarian data
node seed_librarian.js

5. Start the Server
Start your local development backend server:
npm start


http://localhost:3000.
