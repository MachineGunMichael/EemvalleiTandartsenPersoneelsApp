const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const path = require("path");

const dbPath = path.join(__dirname, "database.sqlite");

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
    process.exit(1);
  }
  console.log("Connected to SQLite database.");
});

// Create users table and insert admin user
db.serialize(() => {
  // Create users table
  db.run(
    `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'employee')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
    (err) => {
      if (err) {
        console.error("Error creating users table:", err.message);
      } else {
        console.log("Users table created successfully.");
      }
    }
  );

  // Hash the admin password
  const adminPassword = bcrypt.hashSync("admin", 10);

  // Insert admin user (or update if exists)
  db.run(
    `
    INSERT OR REPLACE INTO users (email, password, name, role)
    VALUES (?, ?, ?, ?)
  `,
    ["admin@eemvalleitandartsen.nl", adminPassword, "Administrator", "admin"],
    function (err) {
      if (err) {
        console.error("Error inserting admin user:", err.message);
      } else {
        console.log("Admin user created successfully.");
        console.log("");
        console.log("=".repeat(50));
        console.log("DATABASE INITIALIZED SUCCESSFULLY");
        console.log("=".repeat(50));
        console.log("");
        console.log("Admin account credentials:");
        console.log("  Email:    admin@eemvalleitandartsen.nl");
        console.log("  Password: admin");
        console.log("");
        console.log("=".repeat(50));
      }
    }
  );
});

// Close database connection
db.close((err) => {
  if (err) {
    console.error("Error closing database:", err.message);
  } else {
    console.log("Database connection closed.");
  }
});

