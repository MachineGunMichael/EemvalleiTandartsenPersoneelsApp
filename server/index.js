const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5001;

// Database path
const dbPath = path.join(__dirname, "database.sqlite");

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

        // If role is employee, create employee record and contract
        if (role === "employee" && dienstverband) {
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

              // Create contract for current month and remaining months of the year
              for (let month = currentMonth; month <= 12; month++) {
                db.run(
                  `INSERT INTO employee_contracts 
                   (employee_id, year, month, dienstverband, hours_per_week, hourly_rate, vakantietoeslag_percentage, bonus_percentage)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [employeeId, currentYear, month, dienstverband, hours_per_week, hourly_rate, vakantietoeslag_percentage || 8, bonus_percentage || 0],
                  function(contractErr) {
                    if (!contractErr && this.lastID) {
                      insertWorkSchedule(this.lastID);
                    }
                  }
                );
              }

              // Create contracts for next year too
              for (let month = 1; month <= 12; month++) {
                db.run(
                  `INSERT INTO employee_contracts 
                   (employee_id, year, month, dienstverband, hours_per_week, hourly_rate, vakantietoeslag_percentage, bonus_percentage)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [employeeId, currentYear + 1, month, dienstverband, hours_per_week, hourly_rate, vakantietoeslag_percentage || 8, bonus_percentage || 0],
                  function(contractErr) {
                    if (!contractErr && this.lastID) {
                      insertWorkSchedule(this.lastID);
                    }
                  }
                );
              }

              // Create holiday records
              const years = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3, currentYear + 4];
              years.forEach((year) => {
                const hours = (year === currentYear || year === currentYear + 1) ? (available_hours || 0) : 0;
                db.run(
                  `INSERT INTO employee_holidays (employee_id, year, available_hours, used_hours) VALUES (?, ?, ?, 0)`,
                  [employeeId, year, hours]
                );
              });

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
        const bcrypt = require("bcrypt");
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
      cws.sunday_hours
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
      cws.sunday_hours
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
  const { year, month, dienstverband, hours_per_week, hourly_rate, vakantietoeslag_percentage, bonus_percentage, werkrooster } = req.body;

  if (!year || !month || !dienstverband || hours_per_week === undefined || hourly_rate === undefined) {
    return res.status(400).json({ message: "Alle velden zijn verplicht" });
  }

  const query = `
    INSERT OR REPLACE INTO employee_contracts 
    (employee_id, year, month, dienstverband, hours_per_week, hourly_rate, vakantietoeslag_percentage, bonus_percentage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [employeeId, year, month, dienstverband, hours_per_week, hourly_rate, vakantietoeslag_percentage || 8, bonus_percentage || 0],
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

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log("");
      console.log("=".repeat(50));
      console.log(`SERVER RUNNING ON PORT ${PORT}`);
      console.log("=".repeat(50));
      console.log("");
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
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

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
