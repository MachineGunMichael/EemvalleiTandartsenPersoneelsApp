const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const path = require("path");
const nodemailer = require("nodemailer");
const multer = require("multer");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// Configure multer for file uploads - use persistent disk in production
const uploadsDir = process.env.UPLOADS_PATH || path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

const app = express();
const PORT = process.env.PORT || 5001;

// Database path - use persistent disk in production
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "database.sqlite");

// Email configuration for SiteGround
const EMAIL_CONFIG = {
  host: "mail.eemvalleitandartsen.nl",
  port: 465,
  secure: true, // true for port 465 (SSL)
  auth: {
    user: "info@eemvalleitandartsen.nl",
    pass: "LaylaMichaelLief123!",
  },
};

// Create email transporter (only if credentials are configured)
let emailTransporter = null;
if (EMAIL_CONFIG.auth.user && EMAIL_CONFIG.auth.pass) {
  emailTransporter = nodemailer.createTransport(EMAIL_CONFIG);
  console.log("Email notifications enabled");
} else {
  console.log("Email notifications disabled (SMTP credentials not configured)");
}

// Helper function to send email notifications
async function sendEmailNotification(to, subject, htmlContent) {
  if (!emailTransporter) {
    console.log(`[Email disabled] Would send to ${to}: ${subject}`);
    return;
  }

  try {
    await emailTransporter.sendMail({
      from: `"Eemvallei Tandartsen" <${EMAIL_CONFIG.auth.user}>`,
      to,
      subject,
      html: htmlContent,
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error("Error sending email:", err.message);
  }
}

// Helper function to recalculate all balances for an employee
function recalculateAllBalances(employeeId) {
  db.all(
    `SELECT * FROM holiday_transactions WHERE employee_id = ? ORDER BY transaction_date ASC, id ASC`,
    [employeeId],
    (err, transactions) => {
      if (err || !transactions || transactions.length === 0) return;

      let runningBalance = 0;
      transactions.forEach((t) => {
        if (t.type === 'added') {
          runningBalance += parseFloat(t.hours);
        } else {
          runningBalance -= parseFloat(t.hours);
        }
        // Update this transaction's balance_after
        db.run(
          `UPDATE holiday_transactions SET balance_after = ? WHERE id = ?`,
          [runningBalance, t.id]
        );
      });
      console.log(`Recalculated balances for employee ${employeeId}`);
    }
  );
}

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
let db;

const connectDB = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("Error connecting to database:", err.message);
        reject(err);
      } else {
        console.log("Connected to SQLite database.");
        // Enable foreign keys
        db.run("PRAGMA foreign_keys = ON");
        // Enable WAL mode for better concurrency with multiple users
        db.run("PRAGMA journal_mode = WAL");
        // Set busy timeout to 5 seconds (wait instead of failing on lock)
        db.run("PRAGMA busy_timeout = 5000");
        
        // Add positie column to employee_contracts if it doesn't exist
        db.all("PRAGMA table_info(employee_contracts)", (err, columns) => {
          if (err) {
            console.error("Error checking columns:", err.message);
          } else {
            const hasPositie = columns.some(col => col.name === 'positie');
            if (!hasPositie) {
              db.run(
                "ALTER TABLE employee_contracts ADD COLUMN positie TEXT DEFAULT 'assistent'",
                (alterErr) => {
                  if (alterErr) {
                    console.error("Error adding positie column:", alterErr.message);
                  } else {
                    console.log("Added positie column to employee_contracts table.");
                    db.run("UPDATE employee_contracts SET positie = 'assistent' WHERE positie IS NULL OR positie = ''");
                  }
                }
              );
            }
          }
        });
        
        // Create vacation_requests table
        db.run(`
          CREATE TABLE IF NOT EXISTS vacation_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            request_date DATE NOT NULL,
            hours REAL NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
            reviewed_by INTEGER,
            reviewed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
            FOREIGN KEY (reviewed_by) REFERENCES users(id)
          )
        `, (err) => {
          if (err && !err.message.includes('already exists')) {
            console.error("Error creating vacation_requests table:", err.message);
          }
        });
        
        // Create notifications table
        db.run(`
          CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('vacation_request', 'vacation_approved', 'vacation_rejected', 'overtime_request', 'overtime_approved', 'overtime_rejected')),
            reference_id INTEGER,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err && !err.message.includes('already exists')) {
            console.error("Error creating notifications table:", err.message);
          }
        });
        
        // Create employee_overtime table (yearly tracking)
        db.run(`
          CREATE TABLE IF NOT EXISTS employee_overtime (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            year INTEGER NOT NULL,
            total_hours REAL NOT NULL DEFAULT 0,
            converted_hours REAL NOT NULL DEFAULT 0,
            paid_hours REAL NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
            UNIQUE(employee_id, year)
          )
        `, (err) => {
          if (err && !err.message.includes('already exists')) {
            console.error("Error creating employee_overtime table:", err.message);
          }
        });
        
        // Create overtime_transactions table
        db.run(`
          CREATE TABLE IF NOT EXISTS overtime_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            year INTEGER NOT NULL,
            transaction_date DATE NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('added', 'converted', 'paid')),
            hours REAL NOT NULL,
            description TEXT,
            balance_after REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err && !err.message.includes('already exists')) {
            console.error("Error creating overtime_transactions table:", err.message);
          }
        });
        
        // Create overtime_requests table
        db.run(`
          CREATE TABLE IF NOT EXISTS overtime_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            request_date DATE NOT NULL,
            hours REAL NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
            reviewed_by INTEGER,
            reviewed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
            FOREIGN KEY (reviewed_by) REFERENCES users(id)
          )
        `, (err) => {
          if (err && !err.message.includes('already exists')) {
            console.error("Error creating overtime_requests table:", err.message);
          }
        });
        
        resolve();
      }
    });
  });
};

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Login endpoint
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "E-mailadres en wachtwoord zijn verplicht" });
  }

  db.get("SELECT * FROM users WHERE email = ?", [email.toLowerCase()], (err, user) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Er is een serverfout opgetreden" });
    }

    if (!user) {
      return res.status(401).json({ message: "Ongeldige inloggegevens" });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ message: "Dit account is gedeactiveerd. Neem contact op met de beheerder." });
    }

    // Compare passwords
    const isValidPassword = bcrypt.compareSync(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Ongeldige inloggegevens" });
    }

    // Get employee_id if user is an employee
    if (user.role === "employee") {
      db.get("SELECT id FROM employees WHERE user_id = ?", [user.id], (err, employee) => {
        if (err) {
          console.error("Database error:", err.message);
        }
        res.json({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          employee_id: employee ? employee.id : null,
        });
      });
    } else {
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    }
  });
});

// Get all users (admin only)
app.get("/api/users", (req, res) => {
  db.all("SELECT id, email, plain_password, name, role, is_active, created_at FROM users", [], (err, users) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Er is een serverfout opgetreden" });
    }
    res.json(users);
  });
});

// Create new user with employee data (admin only)
app.post("/api/users", (req, res) => {
  const { 
    email, 
    password, 
    name, 
    role,
    // Employee contract data
    dienstverband,
    positie,
    hours_per_week,
    hourly_rate,
    vakantietoeslag_percentage,
    bonus_percentage,
    available_hours,
    werkrooster
  } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ message: "Alle velden zijn verplicht" });
  }

  if (!["admin", "manager", "employee"].includes(role)) {
    return res.status(400).json({ message: "Ongeldige rol" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Start transaction
  db.serialize(() => {
    db.run(
      "INSERT INTO users (email, password, plain_password, name, role, is_active) VALUES (?, ?, ?, ?, ?, 1)",
      [email.toLowerCase(), hashedPassword, password, name, role],
      function (userErr) {
        if (userErr) {
          if (userErr.message.includes("UNIQUE constraint failed")) {
            return res.status(400).json({ message: "E-mailadres is al in gebruik" });
          }
          console.error("Database error:", userErr.message);
          return res.status(500).json({ message: "Er is een serverfout opgetreden" });
        }

        const userId = this.lastID;

        // If role is employee or manager, create employee record and contract
        if ((role === "employee" || role === "manager") && dienstverband) {
          db.run(
            "INSERT INTO employees (user_id) VALUES (?)",
            [userId],
            function (empErr) {
              if (empErr) {
                console.error("Error creating employee:", empErr.message);
                return res.status(500).json({ message: "Fout bij aanmaken medewerker" });
              }

              const employeeId = this.lastID;
              const contractIds = [];

              // Helper to insert work schedule for a contract
              const insertWorkSchedule = (contractId) => {
                if (werkrooster) {
                  db.run(
                    `INSERT INTO contract_work_schedule 
                     (contract_id, monday_hours, tuesday_hours, wednesday_hours, thursday_hours, friday_hours, saturday_hours, sunday_hours)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                      contractId,
                      werkrooster.monday_hours || 0,
                      werkrooster.tuesday_hours || 0,
                      werkrooster.wednesday_hours || 0,
                      werkrooster.thursday_hours || 0,
                      werkrooster.friday_hours || 0,
                      werkrooster.saturday_hours || 0,
                      werkrooster.sunday_hours || 0,
                    ]
                  );
                }
              };

              // Create single contract for the current month only
              db.run(
                `INSERT INTO employee_contracts 
                 (employee_id, year, month, dienstverband, positie, hours_per_week, hourly_rate, vakantietoeslag_percentage, bonus_percentage)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [employeeId, currentYear, currentMonth, dienstverband, positie || 'assistent', hours_per_week, hourly_rate, vakantietoeslag_percentage || 8, bonus_percentage || 0],
                function(contractErr) {
                  if (!contractErr && this.lastID) {
                    insertWorkSchedule(this.lastID);
                  }
                }
              );

              // Create holiday record for current year only
              db.run(
                `INSERT INTO employee_holidays (employee_id, year, available_hours, used_hours) VALUES (?, ?, ?, 0)`,
                [employeeId, currentYear, available_hours || 0]
              );

              res.status(201).json({
                id: userId,
                employee_id: employeeId,
                email: email.toLowerCase(),
                name,
                role,
              });
            }
          );
        } else {
          res.status(201).json({
            id: userId,
            email: email.toLowerCase(),
            name,
            role,
          });
        }
      }
    );
  });
});

// Update user details
app.put("/api/users/:id", (req, res) => {
  const userId = req.params.id;
  const { name, email, password, role } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Naam en e-mailadres zijn verplicht" });
  }

  // Check if email is already used by another user
  db.get(
    "SELECT id FROM users WHERE email = ? AND id != ?",
    [email, userId],
    (err, existingUser) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }

      if (existingUser) {
        return res.status(400).json({ message: "Dit e-mailadres is al in gebruik" });
      }

      // If password is provided, hash it
      if (password && password.trim() !== "") {
        bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
          if (hashErr) {
            console.error("Hash error:", hashErr.message);
            return res.status(500).json({ message: "Er is een serverfout opgetreden" });
          }

          db.run(
            "UPDATE users SET name = ?, email = ?, password = ?, role = ? WHERE id = ?",
            [name, email, hashedPassword, role, userId],
            function (updateErr) {
              if (updateErr) {
                console.error("Database error:", updateErr.message);
                return res.status(500).json({ message: "Er is een serverfout opgetreden" });
              }
              if (this.changes === 0) {
                return res.status(404).json({ message: "Gebruiker niet gevonden" });
              }
              res.json({ message: "Gebruiker bijgewerkt" });
            }
          );
        });
      } else {
        // Update without changing password
        db.run(
          "UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?",
          [name, email, role, userId],
          function (updateErr) {
            if (updateErr) {
              console.error("Database error:", updateErr.message);
              return res.status(500).json({ message: "Er is een serverfout opgetreden" });
            }
            if (this.changes === 0) {
              return res.status(404).json({ message: "Gebruiker niet gevonden" });
            }
            res.json({ message: "Gebruiker bijgewerkt" });
          }
        );
      }
    }
  );
});

// Deactivate user (soft delete - admin only)
app.put("/api/users/:id/deactivate", (req, res) => {
  const userId = req.params.id;

  // Don't allow deactivating the last admin
  db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1", [], (err, result) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Er is een serverfout opgetreden" });
    }

    db.get("SELECT role FROM users WHERE id = ?", [userId], (err, user) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }

      if (!user) {
        return res.status(404).json({ message: "Gebruiker niet gevonden" });
      }

      // If trying to deactivate an admin and there's only one active admin left
      if (user.role === "admin" && result.count <= 1) {
        return res.status(400).json({ message: "Kan de laatste beheerder niet deactiveren" });
      }

      db.run(
        "UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [userId],
        function (err) {
          if (err) {
            console.error("Database error:", err.message);
            return res.status(500).json({ message: "Er is een serverfout opgetreden" });
          }
          res.json({ message: "Gebruiker gedeactiveerd" });
        }
      );
    });
  });
});

// Reactivate user (admin only)
app.put("/api/users/:id/reactivate", (req, res) => {
  const userId = req.params.id;

  db.run(
    "UPDATE users SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [userId],
    function (err) {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "Gebruiker niet gevonden" });
      }
      res.json({ message: "Gebruiker geactiveerd" });
    }
  );
});

// Complete delete user (admin only) - removes all data
app.delete("/api/users/:id", (req, res) => {
  const userId = req.params.id;

  // First get the employee id if exists
  db.get("SELECT id FROM employees WHERE user_id = ?", [userId], (err, employee) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Er is een serverfout opgetreden" });
    }

    db.serialize(() => {
      // Delete employee-related data if employee exists
      if (employee) {
        db.run("DELETE FROM employee_holidays WHERE employee_id = ?", [employee.id]);
        db.run("DELETE FROM employee_contracts WHERE employee_id = ?", [employee.id]);
        db.run("DELETE FROM employees WHERE id = ?", [employee.id]);
      }

      // Delete the user
      db.run("DELETE FROM users WHERE id = ?", [userId], function (err) {
        if (err) {
          console.error("Database error:", err.message);
          return res.status(500).json({ message: "Er is een serverfout opgetreden" });
        }
        if (this.changes === 0) {
          return res.status(404).json({ message: "Gebruiker niet gevonden" });
        }
        res.json({ message: "Gebruiker volledig verwijderd" });
      });
    });
  });
});

// Get all employees with their current contract and holiday data
// Used by admin and manager to see all employees
app.get("/api/employees", (req, res) => {
  const currentYear = new Date().getFullYear();

  // Fetch most recent contract for each employee (not just current month)
  const query = `
    SELECT 
      e.id as employee_id,
      u.id as user_id,
      u.name,
      u.email,
      ec.dienstverband,
      ec.positie,
      ec.hours_per_week,
      ec.hourly_rate,
      ec.vakantietoeslag_percentage,
      ec.bonus_percentage,
      eh.available_hours,
      eh.used_hours,
      eh.year as holiday_year,
      cws.monday_hours,
      cws.tuesday_hours,
      cws.wednesday_hours,
      cws.thursday_hours,
      cws.friday_hours,
      cws.saturday_hours,
      cws.sunday_hours,
      (SELECT COALESCE(SUM(CASE WHEN type = 'added' THEN hours ELSE -hours END), 0) 
       FROM overtime_transactions WHERE employee_id = e.id) as overtime_balance
    FROM employees e
    JOIN users u ON e.user_id = u.id
    LEFT JOIN employee_contracts ec ON ec.id = (
      SELECT id FROM employee_contracts 
      WHERE employee_id = e.id 
      ORDER BY year DESC, month DESC 
      LIMIT 1
    )
    LEFT JOIN employee_holidays eh ON e.id = eh.employee_id 
      AND eh.year = ?
    LEFT JOIN contract_work_schedule cws ON ec.id = cws.contract_id
    WHERE u.is_active = 1
    ORDER BY u.name
  `;

  db.all(query, [currentYear], (err, employees) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Er is een serverfout opgetreden" });
    }
    res.json(employees);
  });
});

// Get single employee data (for employee's own view)
app.get("/api/employees/:id", (req, res) => {
  const employeeId = req.params.id;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const query = `
    SELECT 
      e.id as employee_id,
      u.id as user_id,
      u.name,
      u.email,
      ec.dienstverband,
      ec.hours_per_week,
      ec.hourly_rate,
      ec.vakantietoeslag_percentage,
      ec.bonus_percentage,
      eh.available_hours,
      eh.used_hours,
      eh.year as holiday_year
    FROM employees e
    JOIN users u ON e.user_id = u.id
    LEFT JOIN employee_contracts ec ON e.id = ec.employee_id 
      AND ec.year = ? AND ec.month = ?
    LEFT JOIN employee_holidays eh ON e.id = eh.employee_id 
      AND eh.year = ?
    WHERE e.id = ?
  `;

  db.get(query, [currentYear, currentMonth, currentYear, employeeId], (err, employee) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Er is een serverfout opgetreden" });
    }
    if (!employee) {
      return res.status(404).json({ message: "Medewerker niet gevonden" });
    }
    res.json(employee);
  });
});

// Get employee by user_id (for logged-in employee to get their own data)
app.get("/api/employees/user/:userId", (req, res) => {
  const userId = req.params.userId;
  const currentYear = new Date().getFullYear();

  // Fetch most recent contract (not just current month)
  const query = `
    SELECT 
      e.id as employee_id,
      u.id as user_id,
      u.name,
      u.email,
      ec.dienstverband,
      ec.hours_per_week,
      ec.hourly_rate,
      ec.vakantietoeslag_percentage,
      ec.bonus_percentage,
      eh.available_hours,
      eh.used_hours,
      eh.year as holiday_year,
      cws.monday_hours,
      cws.tuesday_hours,
      cws.wednesday_hours,
      cws.thursday_hours,
      cws.friday_hours,
      cws.saturday_hours,
      cws.sunday_hours,
      (SELECT COALESCE(SUM(CASE WHEN type = 'added' THEN hours ELSE -hours END), 0) 
       FROM overtime_transactions WHERE employee_id = e.id) as overtime_balance
    FROM employees e
    JOIN users u ON e.user_id = u.id
    LEFT JOIN employee_contracts ec ON ec.id = (
      SELECT id FROM employee_contracts 
      WHERE employee_id = e.id 
      ORDER BY year DESC, month DESC 
      LIMIT 1
    )
    LEFT JOIN employee_holidays eh ON e.id = eh.employee_id 
      AND eh.year = ?
    LEFT JOIN contract_work_schedule cws ON ec.id = cws.contract_id
    WHERE u.id = ?
  `;

  db.get(query, [currentYear, userId], (err, employee) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Er is een serverfout opgetreden" });
    }
    if (!employee) {
      return res.status(404).json({ message: "Medewerker niet gevonden" });
    }
    res.json(employee);
  });
});

// Get employee contract history
app.get("/api/employees/:id/contracts", (req, res) => {
  const employeeId = req.params.id;

  const query = `
    SELECT * FROM employee_contracts 
    WHERE employee_id = ?
    ORDER BY year DESC, month DESC
  `;

  db.all(query, [employeeId], (err, contracts) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Er is een serverfout opgetreden" });
    }
    res.json(contracts);
  });
});

// Get employee holiday history
app.get("/api/employees/:id/holidays", (req, res) => {
  const employeeId = req.params.id;

  const query = `
    SELECT * FROM employee_holidays 
    WHERE employee_id = ?
    ORDER BY year DESC
  `;

  db.all(query, [employeeId], (err, holidays) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Er is een serverfout opgetreden" });
    }
    res.json(holidays);
  });
});

// Update employee contract for a specific month
app.put("/api/employees/:id/contracts", (req, res) => {
  const employeeId = req.params.id;
  const { year, month, dienstverband, hours_per_week, hourly_rate, vakantietoeslag_percentage, bonus_percentage } = req.body;

  if (!year || !month) {
    return res.status(400).json({ message: "Jaar en maand zijn verplicht" });
  }

  const query = `
    INSERT OR REPLACE INTO employee_contracts 
    (employee_id, year, month, dienstverband, hours_per_week, hourly_rate, vakantietoeslag_percentage, bonus_percentage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [employeeId, year, month, dienstverband, hours_per_week, hourly_rate, vakantietoeslag_percentage, bonus_percentage],
    function (err) {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }
      res.json({ message: "Contract bijgewerkt", id: this.lastID });
    }
  );
});

// Update employee holidays for a specific year
app.put("/api/employees/:id/holidays", (req, res) => {
  const employeeId = req.params.id;
  const { year, available_hours, used_hours } = req.body;

  if (!year) {
    return res.status(400).json({ message: "Jaar is verplicht" });
  }

  const query = `
    INSERT OR REPLACE INTO employee_holidays 
    (employee_id, year, available_hours, used_hours, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  db.run(query, [employeeId, year, available_hours || 0, used_hours || 0], function (err) {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Er is een serverfout opgetreden" });
    }
    res.json({ message: "Vakantie-uren bijgewerkt", id: this.lastID });
  });
});

// Get full contract history for an employee (sorted by newest first)
app.get("/api/employees/:id/contract-history", (req, res) => {
  const employeeId = req.params.id;

  const query = `
    SELECT 
      ec.*, 
      u.name as employee_name,
      cws.monday_hours,
      cws.tuesday_hours,
      cws.wednesday_hours,
      cws.thursday_hours,
      cws.friday_hours,
      cws.saturday_hours,
      cws.sunday_hours
    FROM employee_contracts ec
    JOIN employees e ON ec.employee_id = e.id
    JOIN users u ON e.user_id = u.id
    LEFT JOIN contract_work_schedule cws ON ec.id = cws.contract_id
    WHERE ec.employee_id = ?
    ORDER BY ec.year DESC, ec.month DESC
  `;

  db.all(query, [employeeId], (err, rows) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Er is een serverfout opgetreden" });
    }
    res.json(rows || []);
  });
});

// Delete a contract by ID
app.delete("/api/contracts/:id", (req, res) => {
  const contractId = req.params.id;

  // First delete associated work schedule
  db.run("DELETE FROM contract_work_schedule WHERE contract_id = ?", [contractId], (wsErr) => {
    if (wsErr) {
      console.error("Error deleting work schedule:", wsErr.message);
    }

    // Then delete the contract
    db.run("DELETE FROM employee_contracts WHERE id = ?", [contractId], function (err) {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: "Contract niet gevonden" });
      }

      res.json({ message: "Contract verwijderd", id: contractId });
    });
  });
});

// Add a new contract record (doesn't replace, just adds)
app.post("/api/employees/:id/contracts", (req, res) => {
  const employeeId = req.params.id;
  const { year, month, dienstverband, positie, hours_per_week, hourly_rate, vakantietoeslag_percentage, bonus_percentage, werkrooster } = req.body;

  if (!year || !month || !dienstverband || hours_per_week === undefined || hourly_rate === undefined) {
    return res.status(400).json({ message: "Alle velden zijn verplicht" });
  }

  const query = `
    INSERT OR REPLACE INTO employee_contracts 
    (employee_id, year, month, dienstverband, positie, hours_per_week, hourly_rate, vakantietoeslag_percentage, bonus_percentage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [employeeId, year, month, dienstverband, positie || 'assistent', hours_per_week, hourly_rate, vakantietoeslag_percentage || 8, bonus_percentage || 0],
    function (err) {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }

      const contractId = this.lastID;

      // If werkrooster is provided, save it
      if (werkrooster) {
        // First delete any existing work schedule for this contract
        db.run("DELETE FROM contract_work_schedule WHERE contract_id = ?", [contractId], (delErr) => {
          if (delErr) {
            console.error("Error deleting old work schedule:", delErr.message);
          }
          
          // Insert the new work schedule
          db.run(
            `INSERT INTO contract_work_schedule 
             (contract_id, monday_hours, tuesday_hours, wednesday_hours, thursday_hours, friday_hours, saturday_hours, sunday_hours)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              contractId,
              werkrooster.monday_hours || 0,
              werkrooster.tuesday_hours || 0,
              werkrooster.wednesday_hours || 0,
              werkrooster.thursday_hours || 0,
              werkrooster.friday_hours || 0,
              werkrooster.saturday_hours || 0,
              werkrooster.sunday_hours || 0,
            ],
            (wsErr) => {
              if (wsErr) {
                console.error("Error saving work schedule:", wsErr.message);
              }
            }
          );
        });
      }

      res.status(201).json({ message: "Contract toegevoegd", id: contractId });
    }
  );
});

// Get holiday transactions for an employee
app.get("/api/employees/:id/holiday-transactions", (req, res) => {
  const employeeId = req.params.id;
  const year = req.query.year;

  let query = `
    SELECT * FROM holiday_transactions
    WHERE employee_id = ?
  `;
  const params = [employeeId];

  if (year) {
    query += ` AND year = ?`;
    params.push(year);
  }

  query += ` ORDER BY transaction_date ASC, id ASC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Er is een serverfout opgetreden" });
    }
    res.json(rows || []);
  });
});

// Add holiday hours transaction
app.post("/api/employees/:id/holiday-transactions", (req, res) => {
  const employeeId = req.params.id;
  const { year, transaction_date, type, hours, description } = req.body;

  if (!year || !transaction_date || !type || hours === undefined || hours === null || hours === '') {
    return res.status(400).json({ message: "Alle velden zijn verplicht" });
  }

  if (type !== 'added' && type !== 'used') {
    return res.status(400).json({ message: "Type moet 'added' of 'used' zijn" });
  }

  // Allow negative hours for corrections
  const parsedHours = parseFloat(hours);

  // First get current balance
  db.get(
    "SELECT available_hours, used_hours FROM employee_holidays WHERE employee_id = ? AND year = ?",
    [employeeId, year],
    (err, holiday) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }

      let currentAvailable = holiday ? holiday.available_hours : 0;
      let currentUsed = holiday ? holiday.used_hours : 0;
      let newAvailable, newUsed, balanceAfter;

      if (type === 'added') {
        newAvailable = currentAvailable + parseFloat(hours);
        newUsed = currentUsed;
        balanceAfter = newAvailable - newUsed;
      } else {
        newAvailable = currentAvailable;
        newUsed = currentUsed + parseFloat(hours);
        balanceAfter = newAvailable - newUsed;
      }

      // Insert transaction
      db.run(
        `INSERT INTO holiday_transactions (employee_id, year, transaction_date, type, hours, description, balance_after)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [employeeId, year, transaction_date, type, hours, description || '', balanceAfter],
        function (transErr) {
          if (transErr) {
            console.error("Database error:", transErr.message);
            return res.status(500).json({ message: "Er is een serverfout opgetreden" });
          }

          // Update employee_holidays table
          db.run(
            `INSERT OR REPLACE INTO employee_holidays (employee_id, year, available_hours, used_hours, updated_at)
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [employeeId, year, newAvailable, newUsed],
            (updateErr) => {
              if (updateErr) {
                console.error("Database error:", updateErr.message);
                return res.status(500).json({ message: "Er is een serverfout opgetreden" });
              }

              // Recalculate all balance_after values for this employee
              recalculateBalances(db, employeeId, () => {
                res.status(201).json({
                  message: type === 'added' ? "Uren toegevoegd" : "Uren gebruikt",
                  transaction_id: this.lastID,
                  balance_after: balanceAfter,
                  available_hours: newAvailable,
                  used_hours: newUsed
                });
              });
            }
          );
        }
      );
    }
  );
});

// Helper function to recalculate all balance_after values for an employee
function recalculateBalances(db, employeeId, callback) {
  // Get all transactions sorted by date
  db.all(
    `SELECT * FROM holiday_transactions WHERE employee_id = ? ORDER BY transaction_date ASC, id ASC`,
    [employeeId],
    (err, transactions) => {
      if (err || !transactions || transactions.length === 0) {
        if (callback) callback();
        return;
      }

      let runningBalance = 0;
      const yearlySummary = {}; // Track totals per year

      const updatePromises = transactions.map((t, idx) => {
        return new Promise((resolve) => {
          if (t.type === 'added') {
            runningBalance += parseFloat(t.hours);
          } else if (t.type === 'used') {
            runningBalance -= parseFloat(t.hours);
          }

          // Track yearly totals
          if (!yearlySummary[t.year]) {
            yearlySummary[t.year] = { available: 0, used: 0 };
          }
          if (t.type === 'added') {
            yearlySummary[t.year].available += parseFloat(t.hours);
          } else {
            yearlySummary[t.year].used += parseFloat(t.hours);
          }

          db.run(
            `UPDATE holiday_transactions SET balance_after = ? WHERE id = ?`,
            [runningBalance, t.id],
            () => resolve()
          );
        });
      });

      Promise.all(updatePromises).then(() => {
        // Update employee_holidays table for each year
        const yearUpdates = Object.entries(yearlySummary).map(([year, totals]) => {
          return new Promise((resolve) => {
            db.run(
              `INSERT OR REPLACE INTO employee_holidays (employee_id, year, available_hours, used_hours, updated_at)
               VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [employeeId, year, totals.available, totals.used],
              () => resolve()
            );
          });
        });

        Promise.all(yearUpdates).then(() => {
          if (callback) callback();
        });
      });
    }
  );
}

// Delete a holiday transaction
app.delete("/api/holiday-transactions/:id", (req, res) => {
  const transactionId = req.params.id;

  // First get the employee_id from the transaction
  db.get(
    "SELECT employee_id FROM holiday_transactions WHERE id = ?",
    [transactionId],
    (err, transaction) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }

      if (!transaction) {
        return res.status(404).json({ message: "Transactie niet gevonden" });
      }

      const employeeId = transaction.employee_id;

      // Delete the transaction
      db.run("DELETE FROM holiday_transactions WHERE id = ?", [transactionId], function (deleteErr) {
        if (deleteErr) {
          console.error("Database error:", deleteErr.message);
          return res.status(500).json({ message: "Er is een serverfout opgetreden" });
        }

        if (this.changes === 0) {
          return res.status(404).json({ message: "Transactie niet gevonden" });
        }

        // Recalculate all balances for this employee
        recalculateBalances(db, employeeId, () => {
          res.json({ message: "Transactie verwijderd", id: transactionId });
        });
      });
    }
  );
});

// Get current work schedule for an employee (based on latest contract)
app.get("/api/employees/:id/work-schedule", (req, res) => {
  const employeeId = req.params.id;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Get the most recent contract's work schedule
  const query = `
    SELECT cws.*, ec.year, ec.month, ec.hours_per_week
    FROM contract_work_schedule cws
    JOIN employee_contracts ec ON cws.contract_id = ec.id
    WHERE ec.employee_id = ?
    ORDER BY ec.year DESC, ec.month DESC
    LIMIT 1
  `;

  db.get(query, [employeeId], (err, row) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Er is een serverfout opgetreden" });
    }
    if (!row) {
      return res.status(404).json({ message: "Geen werkrooster gevonden" });
    }
    res.json(row);
  });
});

// Get work schedule for a specific date (finds the applicable contract)
app.get("/api/employees/:id/work-schedule-for-date", (req, res) => {
  const employeeId = req.params.id;
  const { date } = req.query; // YYYY-MM-DD format

  if (!date) {
    return res.status(400).json({ message: "Datum is verplicht" });
  }

  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;

  // Find the contract that was active for this date
  // (the most recent contract that started on or before this date)
  const query = `
    SELECT cws.*, ec.year, ec.month, ec.hours_per_week
    FROM contract_work_schedule cws
    JOIN employee_contracts ec ON cws.contract_id = ec.id
    WHERE ec.employee_id = ?
      AND (ec.year < ? OR (ec.year = ? AND ec.month <= ?))
    ORDER BY ec.year DESC, ec.month DESC
    LIMIT 1
  `;

  db.get(query, [employeeId, year, year, month], (err, row) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Er is een serverfout opgetreden" });
    }
    if (!row) {
      return res.status(404).json({ message: "Geen werkrooster gevonden voor deze datum" });
    }
    res.json(row);
  });
});

// ==================== VACATION REQUESTS ====================

// Create vacation request (employee submits)
app.post("/api/vacation-requests", (req, res) => {
  const { employee_id, user_id, request_date, hours, description } = req.body;

  if (!employee_id || !request_date || !hours) {
    return res.status(400).json({ message: "Alle verplichte velden moeten worden ingevuld" });
  }

  // Insert the vacation request
  db.run(
    `INSERT INTO vacation_requests (employee_id, request_date, hours, description, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [employee_id, request_date, hours, description || ''],
    function(err) {
      if (err) {
        console.error("Error creating vacation request:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }

      const requestId = this.lastID;

      // Get the requester's role and name to determine who should review
      db.get(
        `SELECT u.name, u.role FROM users u 
         JOIN employees e ON u.id = e.user_id 
         WHERE e.id = ?`,
        [employee_id],
        (err, requester) => {
          if (err) {
            console.error("Error fetching requester:", err.message);
            return res.status(201).json({ id: requestId, message: "Aanvraag ingediend" });
          }

          // Determine who should receive the notification
          // Employee requests -> Manager
          // Manager requests -> Admin
          let targetRole = requester.role === 'manager' ? 'admin' : 'manager';
          
          const notificationMessage = `${requester.name} heeft ${hours} vakantie-uren aangevraagd voor ${request_date}`;
          
          // Get all users with the target role
          db.all(
            `SELECT id, email, name FROM users WHERE role = ? AND is_active = 1`,
            [targetRole],
            (err, reviewers) => {
              const sendNotificationsAndEmails = (users) => {
                users.forEach(user => {
                  // Create in-app notification
                  createNotification(user.id, 'vacation_request', requestId, notificationMessage);
                  
                  // Send email notification
                  const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                      <h2 style="color: #8B7355;">Vakantie Aanvraag</h2>
                      <p>Beste ${user.name},</p>
                      <p><strong>${requester.name}</strong> heeft een vakantie aanvraag ingediend:</p>
                      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Datum:</strong> ${request_date}</p>
                        <p><strong>Aantal uren:</strong> ${hours}</p>
                        ${description ? `<p><strong>Beschrijving:</strong> ${description}</p>` : ''}
                      </div>
                      <p>Log in op het personeelsportaal om de aanvraag te beoordelen.</p>
                      <p style="color: #888; font-size: 12px;">Eemvallei Tandartsen - Personeelsportaal</p>
                    </div>
                  `;
                  sendEmailNotification(user.email, `Vakantie aanvraag van ${requester.name}`, emailHtml);
                });
              };

              if (err || !reviewers || reviewers.length === 0) {
                // Fallback to admin if no managers found
                db.all(`SELECT id, email, name FROM users WHERE role = 'admin' AND is_active = 1`, (err, admins) => {
                  if (admins && admins.length > 0) {
                    sendNotificationsAndEmails(admins);
                  }
                });
              } else {
                sendNotificationsAndEmails(reviewers);
              }
            }
          );

          res.status(201).json({ id: requestId, message: "Aanvraag ingediend" });
        }
      );
    }
  );
});

// Helper function to create notifications
function createNotification(userId, type, referenceId, message) {
  db.run(
    `INSERT INTO notifications (user_id, type, reference_id, message) VALUES (?, ?, ?, ?)`,
    [userId, type, referenceId, message],
    (err) => {
      if (err) console.error("Error creating notification:", err.message);
    }
  );
}

// Get pending vacation requests (for reviewers)
app.get("/api/vacation-requests", (req, res) => {
  const { status, reviewer_role } = req.query;

  let query = `
    SELECT vr.*, u.name as employee_name, u.role as employee_role
    FROM vacation_requests vr
    JOIN employees e ON vr.employee_id = e.id
    JOIN users u ON e.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ` AND vr.status = ?`;
    params.push(status);
  }

  // If reviewer is manager, show employee requests
  // If reviewer is admin, show manager requests (and employee if no managers)
  if (reviewer_role === 'manager') {
    query += ` AND u.role = 'employee'`;
  } else if (reviewer_role === 'admin') {
    query += ` AND u.role IN ('manager', 'employee')`;
  }

  query += ` ORDER BY vr.created_at DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Er is een serverfout opgetreden" });
    }
    res.json(rows || []);
  });
});

// Approve vacation request
app.put("/api/vacation-requests/:id/approve", (req, res) => {
  const requestId = req.params.id;
  const { reviewer_id } = req.body;

  // Get the request details including employee email
  db.get(
    `SELECT vr.*, e.id as emp_id, u.id as user_id, u.name as employee_name, u.email as employee_email
     FROM vacation_requests vr
     JOIN employees e ON vr.employee_id = e.id
     JOIN users u ON e.user_id = u.id
     WHERE vr.id = ?`,
    [requestId],
    (err, request) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }
      if (!request) {
        return res.status(404).json({ message: "Aanvraag niet gevonden" });
      }

      // Update request status
      db.run(
        `UPDATE vacation_requests SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [reviewer_id, requestId],
        function(updateErr) {
          if (updateErr) {
            console.error("Error updating request:", updateErr.message);
            return res.status(500).json({ message: "Er is een serverfout opgetreden" });
          }

          // Add the hours to holiday_transactions
          const year = new Date(request.request_date).getFullYear();
          
          // Get the transaction just BEFORE this date to calculate the correct balance
          db.get(
            `SELECT balance_after FROM holiday_transactions 
             WHERE employee_id = ? AND (transaction_date < ? OR (transaction_date = ? AND id < (SELECT COALESCE(MAX(id), 0) + 1 FROM holiday_transactions)))
             ORDER BY transaction_date DESC, id DESC 
             LIMIT 1`,
            [request.emp_id, request.request_date, request.request_date],
            (err, prevTransaction) => {
              const prevBalance = prevTransaction ? prevTransaction.balance_after : 0;
              const newBalance = prevBalance - Math.abs(request.hours);

              db.run(
                `INSERT INTO holiday_transactions (employee_id, year, transaction_date, hours, description, type, balance_after)
                 VALUES (?, ?, ?, ?, ?, 'used', ?)`,
                [request.emp_id, year, request.request_date, Math.abs(request.hours), request.description || 'Vakantie', newBalance],
                function(transErr) {
                  if (transErr) {
                    console.error("Error creating transaction:", transErr.message);
                  }

                  // Recalculate all balances after this transaction
                  recalculateAllBalances(request.emp_id);

                  // Update employee_holidays
                  db.run(
                    `INSERT INTO employee_holidays (employee_id, year, available_hours, used_hours)
                     VALUES (?, ?, 0, ?)
                     ON CONFLICT(employee_id, year) DO UPDATE SET used_hours = used_hours + ?`,
                    [request.emp_id, year, Math.abs(request.hours), Math.abs(request.hours)]
                  );

                  // Create in-app notification for the employee
                  createNotification(request.user_id, 'vacation_approved', requestId,
                    `Je vakantieaanvraag voor ${request.request_date} (${request.hours} uur) is goedgekeurd`);

                  // Send email notification to the employee
                  const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                      <h2 style="color: #4CAF50;">✓ Vakantie Goedgekeurd</h2>
                      <p>Beste ${request.employee_name},</p>
                      <p>Je vakantieaanvraag is <strong style="color: #4CAF50;">goedgekeurd</strong>!</p>
                      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
                        <p><strong>Datum:</strong> ${request.request_date}</p>
                        <p><strong>Aantal uren:</strong> ${request.hours}</p>
                        ${request.description ? `<p><strong>Beschrijving:</strong> ${request.description}</p>` : ''}
                      </div>
                      <p>De uren zijn afgeschreven van je vakantiesaldo.</p>
                      <p style="color: #888; font-size: 12px;">Eemvallei Tandartsen - Personeelsportaal</p>
                    </div>
                  `;
                  sendEmailNotification(request.employee_email, 'Vakantie goedgekeurd ✓', emailHtml);

                  res.json({ message: "Aanvraag goedgekeurd" });
                }
              );
            }
          );
        }
      );
    }
  );
});

// Reject vacation request
app.put("/api/vacation-requests/:id/reject", (req, res) => {
  const requestId = req.params.id;
  const { reviewer_id, reason } = req.body;

  // Get the request details including employee email
  db.get(
    `SELECT vr.*, u.id as user_id, u.name as employee_name, u.email as employee_email
     FROM vacation_requests vr
     JOIN employees e ON vr.employee_id = e.id
     JOIN users u ON e.user_id = u.id
     WHERE vr.id = ?`,
    [requestId],
    (err, request) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }
      if (!request) {
        return res.status(404).json({ message: "Aanvraag niet gevonden" });
      }

      // Update request status to rejected
      db.run(
        `UPDATE vacation_requests SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [reviewer_id, requestId],
        function(updateErr) {
          if (updateErr) {
            console.error("Error updating request:", updateErr.message);
            return res.status(500).json({ message: "Er is een serverfout opgetreden" });
          }

          // Create in-app notification for the employee
          const rejectMessage = reason 
            ? `Je vakantieaanvraag voor ${request.request_date} (${request.hours} uur) is afgewezen. Reden: ${reason}`
            : `Je vakantieaanvraag voor ${request.request_date} (${request.hours} uur) is afgewezen`;
          
          createNotification(request.user_id, 'vacation_rejected', requestId, rejectMessage);

          // Send email notification to the employee
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #f44336;">✗ Vakantie Afgewezen</h2>
              <p>Beste ${request.employee_name},</p>
              <p>Je vakantieaanvraag is helaas <strong style="color: #f44336;">afgewezen</strong>.</p>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f44336;">
                <p><strong>Datum:</strong> ${request.request_date}</p>
                <p><strong>Aantal uren:</strong> ${request.hours}</p>
                ${request.description ? `<p><strong>Beschrijving:</strong> ${request.description}</p>` : ''}
                ${reason ? `<p><strong>Reden afwijzing:</strong> ${reason}</p>` : ''}
              </div>
              <p>Neem contact op met je leidinggevende voor meer informatie.</p>
              <p style="color: #888; font-size: 12px;">Eemvallei Tandartsen - Personeelsportaal</p>
            </div>
          `;
          sendEmailNotification(request.employee_email, 'Vakantie afgewezen', emailHtml);

          res.json({ message: "Aanvraag afgewezen" });
        }
      );
    }
  );
});

// ==================== NOTIFICATIONS ====================

// Get notifications for a user
app.get("/api/notifications/:userId", (req, res) => {
  const userId = req.params.userId;
  const { unread_only } = req.query;

  let query = `SELECT * FROM notifications WHERE user_id = ?`;
  if (unread_only === 'true') {
    query += ` AND is_read = 0`;
  }
  query += ` ORDER BY created_at DESC`;

  db.all(query, [userId], (err, rows) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Er is een serverfout opgetreden" });
    }
    res.json(rows || []);
  });
});

// Get unread notification count
app.get("/api/notifications/:userId/count", (req, res) => {
  const userId = req.params.userId;

  db.get(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
    [userId],
    (err, row) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }
      res.json({ count: row ? row.count : 0 });
    }
  );
});

// Mark notification as read
app.put("/api/notifications/:id/read", (req, res) => {
  const notificationId = req.params.id;

  db.run(
    `UPDATE notifications SET is_read = 1 WHERE id = ?`,
    [notificationId],
    function(err) {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }
      res.json({ message: "Notificatie gelezen" });
    }
  );
});

// Mark all notifications as read for a user
app.put("/api/notifications/:userId/read-all", (req, res) => {
  const userId = req.params.userId;

  db.run(
    `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
    [userId],
    function(err) {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }
      res.json({ message: "Alle notificaties gelezen" });
    }
  );
});

// ==================== OVERTIME ====================

// Helper function to recalculate overtime balances
function recalculateOvertimeBalances(employeeId, callback) {
  db.all(
    `SELECT * FROM overtime_transactions WHERE employee_id = ? ORDER BY transaction_date ASC, id ASC`,
    [employeeId],
    (err, transactions) => {
      if (err || !transactions || transactions.length === 0) {
        if (callback) callback();
        return;
      }

      let runningBalance = 0;
      const yearlySummary = {};

      const updatePromises = transactions.map((t) => {
        return new Promise((resolve) => {
          if (t.type === 'added') {
            runningBalance += parseFloat(t.hours);
          } else {
            runningBalance -= parseFloat(t.hours);
          }

          // Track yearly totals
          if (!yearlySummary[t.year]) {
            yearlySummary[t.year] = { total: 0, converted: 0, paid: 0 };
          }
          if (t.type === 'added') {
            yearlySummary[t.year].total += parseFloat(t.hours);
          } else if (t.type === 'converted') {
            yearlySummary[t.year].converted += parseFloat(t.hours);
          } else if (t.type === 'paid') {
            yearlySummary[t.year].paid += parseFloat(t.hours);
          }

          db.run(
            `UPDATE overtime_transactions SET balance_after = ? WHERE id = ?`,
            [runningBalance, t.id],
            () => resolve()
          );
        });
      });

      Promise.all(updatePromises).then(() => {
        const yearUpdates = Object.entries(yearlySummary).map(([year, totals]) => {
          return new Promise((resolve) => {
            db.run(
              `INSERT OR REPLACE INTO employee_overtime (employee_id, year, total_hours, converted_hours, paid_hours, updated_at)
               VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [employeeId, year, totals.total, totals.converted, totals.paid],
              () => resolve()
            );
          });
        });

        Promise.all(yearUpdates).then(() => {
          if (callback) callback();
        });
      });
    }
  );
}

// Get employee overtime summary (yearly)
app.get("/api/employees/:id/overtime", (req, res) => {
  const employeeId = req.params.id;

  db.all(
    `SELECT * FROM employee_overtime WHERE employee_id = ? ORDER BY year DESC`,
    [employeeId],
    (err, rows) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }
      res.json(rows || []);
    }
  );
});

// Get overtime transactions for an employee
app.get("/api/employees/:id/overtime-transactions", (req, res) => {
  const employeeId = req.params.id;
  const year = req.query.year;

  let query = `SELECT * FROM overtime_transactions WHERE employee_id = ?`;
  const params = [employeeId];

  if (year) {
    query += ` AND year = ?`;
    params.push(year);
  }

  query += ` ORDER BY transaction_date ASC, id ASC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Er is een serverfout opgetreden" });
    }
    res.json(rows || []);
  });
});

// Add overtime transaction directly (for admin/manager adding hours)
app.post("/api/employees/:id/overtime-transactions", (req, res) => {
  const employeeId = req.params.id;
  const { year, transaction_date, type, hours, description } = req.body;

  if (!year || !transaction_date || !type || hours === undefined) {
    return res.status(400).json({ message: "Alle velden zijn verplicht" });
  }

  if (!['added', 'converted', 'paid'].includes(type)) {
    return res.status(400).json({ message: "Type moet 'added', 'converted' of 'paid' zijn" });
  }

  // Get last balance before this transaction
  db.get(
    `SELECT balance_after FROM overtime_transactions 
     WHERE employee_id = ? AND (transaction_date < ? OR (transaction_date = ? AND id < (SELECT COALESCE(MAX(id), 0) + 1 FROM overtime_transactions)))
     ORDER BY transaction_date DESC, id DESC 
     LIMIT 1`,
    [employeeId, transaction_date, transaction_date],
    (err, prevTransaction) => {
      const prevBalance = prevTransaction ? prevTransaction.balance_after : 0;
      let newBalance;
      
      if (type === 'added') {
        newBalance = prevBalance + parseFloat(hours);
      } else {
        newBalance = prevBalance - parseFloat(hours);
      }

      db.run(
        `INSERT INTO overtime_transactions (employee_id, year, transaction_date, type, hours, description, balance_after)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [employeeId, year, transaction_date, type, Math.abs(hours), description || '', newBalance],
        function(transErr) {
          if (transErr) {
            console.error("Database error:", transErr.message);
            return res.status(500).json({ message: "Er is een serverfout opgetreden" });
          }

          recalculateOvertimeBalances(employeeId, () => {
            res.status(201).json({
              message: type === 'added' ? "Overuren toegevoegd" : type === 'converted' ? "Overuren omgezet" : "Overuren uitbetaald",
              transaction_id: this.lastID,
              balance_after: newBalance
            });
          });
        }
      );
    }
  );
});

// Delete overtime transaction
app.delete("/api/overtime-transactions/:id", (req, res) => {
  const transactionId = req.params.id;

  db.get(
    "SELECT employee_id FROM overtime_transactions WHERE id = ?",
    [transactionId],
    (err, transaction) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }

      if (!transaction) {
        return res.status(404).json({ message: "Transactie niet gevonden" });
      }

      const employeeId = transaction.employee_id;

      db.run("DELETE FROM overtime_transactions WHERE id = ?", [transactionId], function(deleteErr) {
        if (deleteErr) {
          console.error("Database error:", deleteErr.message);
          return res.status(500).json({ message: "Er is een serverfout opgetreden" });
        }

        if (this.changes === 0) {
          return res.status(404).json({ message: "Transactie niet gevonden" });
        }

        recalculateOvertimeBalances(employeeId, () => {
          res.json({ message: "Transactie verwijderd", id: transactionId });
        });
      });
    }
  );
});

// Convert overtime to vacation hours
app.post("/api/employees/:id/overtime-to-vacation", (req, res) => {
  const employeeId = req.params.id;
  const { hours, description } = req.body;

  if (!hours || hours <= 0) {
    return res.status(400).json({ message: "Voer een geldig aantal uren in" });
  }

  // Check if employee has enough overtime balance
  db.get(
    `SELECT COALESCE(SUM(CASE WHEN type = 'added' THEN hours ELSE -hours END), 0) as balance
     FROM overtime_transactions WHERE employee_id = ?`,
    [employeeId],
    (err, result) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }

      const currentBalance = result ? result.balance : 0;
      if (currentBalance < hours) {
        return res.status(400).json({ message: `Onvoldoende overuren. Beschikbaar: ${currentBalance} uur` });
      }

      const today = new Date().toISOString().split('T')[0];
      const year = new Date().getFullYear();

      // Add overtime transaction (converted)
      db.run(
        `INSERT INTO overtime_transactions (employee_id, year, transaction_date, type, hours, description, balance_after)
         VALUES (?, ?, ?, 'converted', ?, ?, ?)`,
        [employeeId, year, today, hours, description || 'Omgezet naar vakantie-uren', currentBalance - hours],
        function(otErr) {
          if (otErr) {
            console.error("Database error:", otErr.message);
            return res.status(500).json({ message: "Er is een serverfout opgetreden" });
          }

          // Add holiday transaction
          db.get(
            `SELECT balance_after FROM holiday_transactions 
             WHERE employee_id = ? ORDER BY transaction_date DESC, id DESC LIMIT 1`,
            [employeeId],
            (err, lastHoliday) => {
              const holidayBalance = lastHoliday ? lastHoliday.balance_after : 0;
              const newHolidayBalance = holidayBalance + hours;

              db.run(
                `INSERT INTO holiday_transactions (employee_id, year, transaction_date, type, hours, description, balance_after)
                 VALUES (?, ?, ?, 'added', ?, ?, ?)`,
                [employeeId, year, today, hours, 'Omgezet van overuren', newHolidayBalance],
                function(htErr) {
                  if (htErr) {
                    console.error("Database error:", htErr.message);
                    return res.status(500).json({ message: "Er is een serverfout opgetreden" });
                  }

                  // Recalculate both balances
                  recalculateOvertimeBalances(employeeId, () => {
                    recalculateBalances(db, employeeId, () => {
                      res.status(201).json({
                        message: `${hours} overuren omgezet naar vakantie-uren`,
                        overtime_balance: currentBalance - hours,
                        holiday_balance: newHolidayBalance
                      });
                    });
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// Payout overtime hours
app.post("/api/employees/:id/overtime-payout", (req, res) => {
  const employeeId = req.params.id;
  const { hours, description } = req.body;

  if (!hours || hours <= 0) {
    return res.status(400).json({ message: "Voer een geldig aantal uren in" });
  }

  // Check if employee has enough overtime balance
  db.get(
    `SELECT COALESCE(SUM(CASE WHEN type = 'added' THEN hours ELSE -hours END), 0) as balance
     FROM overtime_transactions WHERE employee_id = ?`,
    [employeeId],
    (err, result) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }

      const currentBalance = result ? result.balance : 0;
      if (currentBalance < hours) {
        return res.status(400).json({ message: `Onvoldoende overuren. Beschikbaar: ${currentBalance} uur` });
      }

      const today = new Date().toISOString().split('T')[0];
      const year = new Date().getFullYear();

      db.run(
        `INSERT INTO overtime_transactions (employee_id, year, transaction_date, type, hours, description, balance_after)
         VALUES (?, ?, ?, 'paid', ?, ?, ?)`,
        [employeeId, year, today, hours, description || 'Uitbetaald', currentBalance - hours],
        function(transErr) {
          if (transErr) {
            console.error("Database error:", transErr.message);
            return res.status(500).json({ message: "Er is een serverfout opgetreden" });
          }

          recalculateOvertimeBalances(employeeId, () => {
            res.status(201).json({
              message: `${hours} overuren uitbetaald`,
              balance_after: currentBalance - hours
            });
          });
        }
      );
    }
  );
});

// ==================== OVERTIME REQUESTS ====================

// Create overtime request
app.post("/api/overtime-requests", (req, res) => {
  const { employee_id, user_id, request_date, hours, description } = req.body;

  if (!employee_id || !request_date || !hours) {
    return res.status(400).json({ message: "Alle verplichte velden moeten worden ingevuld" });
  }

  db.run(
    `INSERT INTO overtime_requests (employee_id, request_date, hours, description, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [employee_id, request_date, hours, description || ''],
    function(err) {
      if (err) {
        console.error("Error creating overtime request:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }

      const requestId = this.lastID;

      // Get requester info for notification
      db.get(
        `SELECT u.name, u.role FROM users u 
         JOIN employees e ON u.id = e.user_id 
         WHERE e.id = ?`,
        [employee_id],
        (err, requester) => {
          if (err) {
            console.error("Error fetching requester:", err.message);
            return res.status(201).json({ id: requestId, message: "Aanvraag ingediend" });
          }

          let targetRole = requester.role === 'manager' ? 'admin' : 'manager';
          const notificationMessage = `${requester.name} heeft ${hours} overuren aangevraagd voor ${request_date}`;

          db.all(
            `SELECT id, email, name FROM users WHERE role = ? AND is_active = 1`,
            [targetRole],
            (err, reviewers) => {
              const sendNotificationsAndEmails = (users) => {
                users.forEach(user => {
                  createNotification(user.id, 'overtime_request', requestId, notificationMessage);

                  const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                      <h2 style="color: #8B7355;">Overuren Aanvraag</h2>
                      <p>Beste ${user.name},</p>
                      <p><strong>${requester.name}</strong> heeft een overuren aanvraag ingediend:</p>
                      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Datum:</strong> ${request_date}</p>
                        <p><strong>Aantal uren:</strong> ${hours}</p>
                        ${description ? `<p><strong>Beschrijving:</strong> ${description}</p>` : ''}
                      </div>
                      <p>Log in op het personeelsportaal om de aanvraag te beoordelen.</p>
                      <p style="color: #888; font-size: 12px;">Eemvallei Tandartsen - Personeelsportaal</p>
                    </div>
                  `;
                  sendEmailNotification(user.email, `Overuren aanvraag van ${requester.name}`, emailHtml);
                });
              };

              if (err || !reviewers || reviewers.length === 0) {
                db.all(`SELECT id, email, name FROM users WHERE role = 'admin' AND is_active = 1`, (err, admins) => {
                  if (admins && admins.length > 0) {
                    sendNotificationsAndEmails(admins);
                  }
                });
              } else {
                sendNotificationsAndEmails(reviewers);
              }
            }
          );

          res.status(201).json({ id: requestId, message: "Aanvraag ingediend" });
        }
      );
    }
  );
});

// Get pending overtime requests
app.get("/api/overtime-requests", (req, res) => {
  const { status, reviewer_role } = req.query;

  let query = `
    SELECT otr.*, u.name as employee_name, u.role as employee_role
    FROM overtime_requests otr
    JOIN employees e ON otr.employee_id = e.id
    JOIN users u ON e.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ` AND otr.status = ?`;
    params.push(status);
  }

  if (reviewer_role === 'manager') {
    query += ` AND u.role = 'employee'`;
  } else if (reviewer_role === 'admin') {
    query += ` AND u.role IN ('manager', 'employee')`;
  }

  query += ` ORDER BY otr.created_at DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Er is een serverfout opgetreden" });
    }
    res.json(rows || []);
  });
});

// Approve overtime request
app.put("/api/overtime-requests/:id/approve", (req, res) => {
  const requestId = req.params.id;
  const { reviewer_id } = req.body;

  db.get(
    `SELECT otr.*, e.id as emp_id, u.id as user_id, u.name as employee_name, u.email as employee_email
     FROM overtime_requests otr
     JOIN employees e ON otr.employee_id = e.id
     JOIN users u ON e.user_id = u.id
     WHERE otr.id = ?`,
    [requestId],
    (err, request) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }
      if (!request) {
        return res.status(404).json({ message: "Aanvraag niet gevonden" });
      }

      db.run(
        `UPDATE overtime_requests SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [reviewer_id, requestId],
        function(updateErr) {
          if (updateErr) {
            console.error("Error updating request:", updateErr.message);
            return res.status(500).json({ message: "Er is een serverfout opgetreden" });
          }

          const year = new Date(request.request_date).getFullYear();

          // Get last balance
          db.get(
            `SELECT balance_after FROM overtime_transactions 
             WHERE employee_id = ? ORDER BY transaction_date DESC, id DESC LIMIT 1`,
            [request.emp_id],
            (err, prevTransaction) => {
              const prevBalance = prevTransaction ? prevTransaction.balance_after : 0;
              const newBalance = prevBalance + Math.abs(request.hours);

              db.run(
                `INSERT INTO overtime_transactions (employee_id, year, transaction_date, hours, description, type, balance_after)
                 VALUES (?, ?, ?, ?, ?, 'added', ?)`,
                [request.emp_id, year, request.request_date, Math.abs(request.hours), request.description || 'Overuren', newBalance],
                function(transErr) {
                  if (transErr) {
                    console.error("Error creating transaction:", transErr.message);
                  }

                  recalculateOvertimeBalances(request.emp_id);

                  createNotification(request.user_id, 'overtime_approved', requestId,
                    `Je overurenaanvraag voor ${request.request_date} (${request.hours} uur) is goedgekeurd`);

                  const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                      <h2 style="color: #4CAF50;">✓ Overuren Goedgekeurd</h2>
                      <p>Beste ${request.employee_name},</p>
                      <p>Je overurenaanvraag is <strong style="color: #4CAF50;">goedgekeurd</strong>!</p>
                      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
                        <p><strong>Datum:</strong> ${request.request_date}</p>
                        <p><strong>Aantal uren:</strong> ${request.hours}</p>
                        ${request.description ? `<p><strong>Beschrijving:</strong> ${request.description}</p>` : ''}
                      </div>
                      <p>De uren zijn toegevoegd aan je overurensaldo.</p>
                      <p style="color: #888; font-size: 12px;">Eemvallei Tandartsen - Personeelsportaal</p>
                    </div>
                  `;
                  sendEmailNotification(request.employee_email, 'Overuren goedgekeurd ✓', emailHtml);

                  res.json({ message: "Aanvraag goedgekeurd" });
                }
              );
            }
          );
        }
      );
    }
  );
});

// Reject overtime request
app.put("/api/overtime-requests/:id/reject", (req, res) => {
  const requestId = req.params.id;
  const { reviewer_id, reason } = req.body;

  db.get(
    `SELECT otr.*, u.id as user_id, u.name as employee_name, u.email as employee_email
     FROM overtime_requests otr
     JOIN employees e ON otr.employee_id = e.id
     JOIN users u ON e.user_id = u.id
     WHERE otr.id = ?`,
    [requestId],
    (err, request) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }
      if (!request) {
        return res.status(404).json({ message: "Aanvraag niet gevonden" });
      }

      db.run(
        `UPDATE overtime_requests SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [reviewer_id, requestId],
        function(updateErr) {
          if (updateErr) {
            console.error("Error updating request:", updateErr.message);
            return res.status(500).json({ message: "Er is een serverfout opgetreden" });
          }

          const rejectMessage = reason 
            ? `Je overurenaanvraag voor ${request.request_date} (${request.hours} uur) is afgewezen. Reden: ${reason}`
            : `Je overurenaanvraag voor ${request.request_date} (${request.hours} uur) is afgewezen`;
          
          createNotification(request.user_id, 'overtime_rejected', requestId, rejectMessage);

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #f44336;">✗ Overuren Afgewezen</h2>
              <p>Beste ${request.employee_name},</p>
              <p>Je overurenaanvraag is helaas <strong style="color: #f44336;">afgewezen</strong>.</p>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f44336;">
                <p><strong>Datum:</strong> ${request.request_date}</p>
                <p><strong>Aantal uren:</strong> ${request.hours}</p>
                ${request.description ? `<p><strong>Beschrijving:</strong> ${request.description}</p>` : ''}
                ${reason ? `<p><strong>Reden afwijzing:</strong> ${reason}</p>` : ''}
              </div>
              <p>Neem contact op met je leidinggevende voor meer informatie.</p>
              <p style="color: #888; font-size: 12px;">Eemvallei Tandartsen - Personeelsportaal</p>
            </div>
          `;
          sendEmailNotification(request.employee_email, 'Overuren afgewezen', emailHtml);

          res.json({ message: "Aanvraag afgewezen" });
        }
      );
    }
  );
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const buildPath = path.join(__dirname, "..", "build");
  app.use(express.static(buildPath));
  
  // Handle React routing - serve index.html for all non-API routes
  app.get("*", (req, res, next) => {
    // Don't serve index.html for API routes - pass to next handler
    if (req.path.startsWith("/api/")) {
      return next();
    }
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log("");
      console.log("=".repeat(50));
      console.log(`SERVER RUNNING ON PORT ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log("=".repeat(50));
      console.log("");
      if (process.env.NODE_ENV !== "production") {
        console.log("Available endpoints:");
        console.log(`  GET  http://localhost:${PORT}/api/health`);
        console.log(`  POST http://localhost:${PORT}/api/login`);
        console.log(`  GET  http://localhost:${PORT}/api/users`);
        console.log(`  POST http://localhost:${PORT}/api/users`);
        console.log(`  GET  http://localhost:${PORT}/api/employees`);
        console.log(`  GET  http://localhost:${PORT}/api/employees/:id`);
        console.log(`  GET  http://localhost:${PORT}/api/employees/user/:userId`);
        console.log(`  GET  http://localhost:${PORT}/api/employees/:id/contracts`);
        console.log(`  PUT  http://localhost:${PORT}/api/employees/:id/contracts`);
        console.log(`  GET  http://localhost:${PORT}/api/employees/:id/holidays`);
        console.log(`  PUT  http://localhost:${PORT}/api/employees/:id/holidays`);
        console.log("");
      }
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

// ==================== DOCUMENTS API ====================

// Get all documents
app.get("/api/documents", (req, res) => {
  db.all(
    `SELECT d.*, u.name as uploaded_by_name 
     FROM documents d 
     LEFT JOIN users u ON d.uploaded_by = u.id 
     ORDER BY d.created_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error("Error fetching documents:", err.message);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(rows || []);
    }
  );
});

// Upload a document
app.post("/api/documents", upload.single("document"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const displayName = req.body.display_name || req.body.displayName;
  const uploadedBy = req.body.uploaded_by || req.body.uploadedBy;
  
  if (!displayName) {
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Display name required" });
  }

  db.run(
    `INSERT INTO documents (filename, original_name, display_name, mime_type, size, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      req.file.filename,
      req.file.originalname,
      displayName,
      req.file.mimetype,
      req.file.size,
      uploadedBy,
    ],
    function (err) {
      if (err) {
        console.error("Error saving document:", err.message);
        fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: "Database error" });
      }
      
      res.status(201).json({
        id: this.lastID,
        filename: req.file.filename,
        original_name: req.file.originalname,
        display_name: displayName,
        mime_type: req.file.mimetype,
        size: req.file.size,
        uploaded_by: uploadedBy,
      });
    }
  );
});

// Serve document file
app.get("/api/documents/:id/file", (req, res) => {
  const { id } = req.params;
  
  db.get("SELECT * FROM documents WHERE id = ?", [id], (err, doc) => {
    if (err) {
      console.error("Error fetching document:", err.message);
      return res.status(500).json({ error: "Database error" });
    }
    
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    const filePath = path.join(uploadsDir, doc.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }
    
    res.setHeader("Content-Type", doc.mime_type);
    res.setHeader("Content-Disposition", `inline; filename="${doc.original_name}"`);
    res.sendFile(filePath);
  });
});

// Update document name
app.put("/api/documents/:id", (req, res) => {
  const { id } = req.params;
  const displayName = req.body.display_name || req.body.displayName;
  
  if (!displayName) {
    return res.status(400).json({ error: "Display name required" });
  }
  
  db.run(
    "UPDATE documents SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [displayName, id],
    function (err) {
      if (err) {
        console.error("Error updating document:", err.message);
        return res.status(500).json({ error: "Database error" });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      res.json({ message: "Document updated successfully" });
    }
  );
});

// Delete document
app.delete("/api/documents/:id", (req, res) => {
  const { id } = req.params;
  
  db.get("SELECT * FROM documents WHERE id = ?", [id], (err, doc) => {
    if (err) {
      console.error("Error fetching document:", err.message);
      return res.status(500).json({ error: "Database error" });
    }
    
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    // Delete from database
    db.run("DELETE FROM documents WHERE id = ?", [id], function (err) {
      if (err) {
        console.error("Error deleting document:", err.message);
        return res.status(500).json({ error: "Database error" });
      }
      
      // Delete file from disk
      const filePath = path.join(uploadsDir, doc.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      res.json({ message: "Document deleted successfully" });
    });
  });
});

// ==================== ORDERS (BESTELLINGEN) API ====================

// Get all order items
app.get("/api/orders", (req, res) => {
  db.all(
    `SELECT o.*, u.name as added_by_name 
     FROM order_items o 
     LEFT JOIN users u ON o.added_by = u.id 
     ORDER BY o.created_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error("Error fetching orders:", err.message);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(rows || []);
    }
  );
});

// Add an order item (all roles can add)
app.post("/api/orders", (req, res) => {
  const { item_text, added_by } = req.body;
  
  if (!item_text || !added_by) {
    return res.status(400).json({ error: "Item text and user ID required" });
  }

  db.run(
    `INSERT INTO order_items (item_text, added_by) VALUES (?, ?)`,
    [item_text.trim(), added_by],
    function (err) {
      if (err) {
        console.error("Error adding order item:", err.message);
        return res.status(500).json({ error: "Database error" });
      }
      
      res.status(201).json({
        id: this.lastID,
        item_text: item_text.trim(),
        added_by,
        created_at: new Date().toISOString(),
      });
    }
  );
});

// Delete a single order item (all roles can delete individual items)
app.delete("/api/orders/:id", (req, res) => {
  const { id } = req.params;
  
  db.run("DELETE FROM order_items WHERE id = ?", [id], function (err) {
    if (err) {
      console.error("Error deleting order item:", err.message);
      return res.status(500).json({ error: "Database error" });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: "Order item not found" });
    }
    
    res.json({ message: "Item deleted successfully" });
  });
});

// Clear all order items (only manager/admin)
app.delete("/api/orders", (req, res) => {
  const { role } = req.query;
  
  if (role !== "admin" && role !== "manager") {
    return res.status(403).json({ error: "Only managers and admins can clear the list" });
  }
  
  db.run("DELETE FROM order_items", function (err) {
    if (err) {
      console.error("Error clearing order items:", err.message);
      return res.status(500).json({ error: "Database error" });
    }
    
    res.json({ message: "All items cleared successfully", deleted: this.changes });
  });
});

startServer();

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down server...");
  if (db) {
    db.close((err) => {
      if (err) {
        console.error("Error closing database:", err.message);
      } else {
        console.log("Database connection closed.");
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
