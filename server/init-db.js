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

// Initialize database
db.serialize(() => {
  // Enable foreign keys
  db.run("PRAGMA foreign_keys = ON");

  // Create users table
  db.run(
    `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      plain_password TEXT,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'employee')),
      is_active INTEGER NOT NULL DEFAULT 1,
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

  // Create employees table (linked to users)
  db.run(
    `
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `,
    (err) => {
      if (err) {
        console.error("Error creating employees table:", err.message);
      } else {
        console.log("Employees table created successfully.");
      }
    }
  );

  // Create employee_contracts table (monthly history)
  // This tracks: dienstverband, hours per week, hourly rate, vakantietoeslag %, bonus %
  db.run(
    `
    CREATE TABLE IF NOT EXISTS employee_contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL CHECK(month >= 1 AND month <= 12),
      dienstverband TEXT NOT NULL CHECK(dienstverband IN ('proeftijd', 'tijdelijk', 'vast')),
      hours_per_week REAL NOT NULL,
      hourly_rate REAL NOT NULL,
      vakantietoeslag_percentage REAL NOT NULL DEFAULT 8.0,
      bonus_percentage REAL NOT NULL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE(employee_id, year, month)
    )
  `,
    (err) => {
      if (err) {
        console.error("Error creating employee_contracts table:", err.message);
      } else {
        console.log("Employee contracts table created successfully.");
      }
    }
  );

  // Create employee_holidays table (yearly tracking)
  db.run(
    `
    CREATE TABLE IF NOT EXISTS employee_holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      available_hours REAL NOT NULL DEFAULT 0,
      used_hours REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE(employee_id, year)
    )
  `,
    (err) => {
      if (err) {
        console.error("Error creating employee_holidays table:", err.message);
      } else {
        console.log("Employee holidays table created successfully.");
      }
    }
  );

  // Create holiday_transactions table (tracking when hours are added/used)
  db.run(
    `
    CREATE TABLE IF NOT EXISTS holiday_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      transaction_date DATE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('added', 'used')),
      hours REAL NOT NULL,
      description TEXT,
      balance_after REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `,
    (err) => {
      if (err) {
        console.error("Error creating holiday_transactions table:", err.message);
      } else {
        console.log("Holiday transactions table created successfully.");
      }
    }
  );

  // Hash passwords
  const adminPassword = bcrypt.hashSync("admin", 10);
  const duyguPassword = bcrypt.hashSync("duygu123", 10);
  const afifaPassword = bcrypt.hashSync("afifa123", 10);

  // Insert admin user
  db.run(
    `INSERT OR REPLACE INTO users (id, email, password, plain_password, name, role) VALUES (1, ?, ?, ?, ?, ?)`,
    ["admin@eemvalleitandartsen.nl", adminPassword, "admin", "Administrator", "admin"],
    function (err) {
      if (err) {
        console.error("Error inserting admin user:", err.message);
      } else {
        console.log("Admin user created successfully.");
      }
    }
  );

  // Insert Duygu user and employee
  db.run(
    `INSERT OR REPLACE INTO users (id, email, password, plain_password, name, role) VALUES (2, ?, ?, ?, ?, ?)`,
    ["duygu@eemvalleitandartsen.nl", duyguPassword, "duygu123", "Duygu Kandemir", "employee"],
    function (err) {
      if (err) {
        console.error("Error inserting Duygu user:", err.message);
      } else {
        console.log("Duygu user created successfully.");
      }
    }
  );

  // Insert Afifa user and employee
  db.run(
    `INSERT OR REPLACE INTO users (id, email, password, plain_password, name, role) VALUES (3, ?, ?, ?, ?, ?)`,
    ["afifa@eemvalleitandartsen.nl", afifaPassword, "afifa123", "Afifa Abdul", "employee"],
    function (err) {
      if (err) {
        console.error("Error inserting Afifa user:", err.message);
      } else {
        console.log("Afifa user created successfully.");
      }
    }
  );

  // Create employee records
  db.run(`INSERT OR REPLACE INTO employees (id, user_id) VALUES (1, 2)`, (err) => {
    if (err) console.error("Error creating Duygu employee:", err.message);
    else console.log("Duygu employee record created.");
  });

  db.run(`INSERT OR REPLACE INTO employees (id, user_id) VALUES (2, 3)`, (err) => {
    if (err) console.error("Error creating Afifa employee:", err.message);
    else console.log("Afifa employee record created.");
  });

  // Create contract records for 2025 and 2026
  const years2025_2026 = [2025, 2026];

  // Duygu's contract: tijdelijk, 28 hours, €16.00, 8% vakantietoeslag, 0% bonus
  years2025_2026.forEach((year) => {
    for (let month = 1; month <= 12; month++) {
      db.run(
        `INSERT OR REPLACE INTO employee_contracts (employee_id, year, month, dienstverband, hours_per_week, hourly_rate, vakantietoeslag_percentage, bonus_percentage)
         VALUES (1, ?, ?, 'tijdelijk', 28, 16.00, 8.0, 0.0)`,
        [year, month],
        (err) => {
          if (err) console.error(`Error creating Duygu contract ${year}-${month}:`, err.message);
        }
      );
    }
  });

  // Afifa's contract: tijdelijk, 12 hours, €14.00, 8% vakantietoeslag, 0% bonus
  years2025_2026.forEach((year) => {
    for (let month = 1; month <= 12; month++) {
      db.run(
        `INSERT OR REPLACE INTO employee_contracts (employee_id, year, month, dienstverband, hours_per_week, hourly_rate, vakantietoeslag_percentage, bonus_percentage)
         VALUES (2, ?, ?, 'tijdelijk', 12, 14.00, 8.0, 0.0)`,
        [year, month],
        (err) => {
          if (err) console.error(`Error creating Afifa contract ${year}-${month}:`, err.message);
        }
      );
    }
  });

  // Create holiday records for 2025, 2026 and onwards (up to 2030)
  const years = [2025, 2026, 2027, 2028, 2029, 2030];

  // Duygu: 112 available hours for 2025/2026, 0 used
  years.forEach((year) => {
    const availableHours = (year === 2025 || year === 2026) ? 112 : 0;
    db.run(
      `INSERT OR REPLACE INTO employee_holidays (employee_id, year, available_hours, used_hours)
       VALUES (1, ?, ?, 0)`,
      [year, availableHours],
      (err) => {
        if (err) console.error(`Error creating Duygu holidays ${year}:`, err.message);
      }
    );
  });

  // Afifa: 48 available hours for 2025/2026, 0 used
  years.forEach((year) => {
    const availableHours = (year === 2025 || year === 2026) ? 48 : 0;
    db.run(
      `INSERT OR REPLACE INTO employee_holidays (employee_id, year, available_hours, used_hours)
       VALUES (2, ?, ?, 0)`,
      [year, availableHours],
      (err) => {
        if (err) console.error(`Error creating Afifa holidays ${year}:`, err.message);
      }
    );
  });

  // Final output
  setTimeout(() => {
    console.log("");
    console.log("=".repeat(60));
    console.log("DATABASE INITIALIZED SUCCESSFULLY");
    console.log("=".repeat(60));
    console.log("");
    console.log("User accounts created:");
    console.log("  1. Admin");
    console.log("     Email:    admin@eemvalleitandartsen.nl");
    console.log("     Password: admin");
    console.log("     Role:     admin");
    console.log("");
    console.log("  2. Duygu Kandemir");
    console.log("     Email:    duygu@eemvalleitandartsen.nl");
    console.log("     Password: duygu123");
    console.log("     Role:     employee");
    console.log("");
    console.log("  3. Afifa Abdul");
    console.log("     Email:    afifa@eemvalleitandartsen.nl");
    console.log("     Password: afifa123");
    console.log("     Role:     employee");
    console.log("");
    console.log("=".repeat(60));
  }, 500);
});

// Close database connection after a delay to ensure all operations complete
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    } else {
      console.log("Database connection closed.");
    }
  });
}, 1000);
