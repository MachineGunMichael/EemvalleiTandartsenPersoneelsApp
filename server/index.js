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
    available_hours
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

              // Create contract for current month and remaining months of the year
              for (let month = currentMonth; month <= 12; month++) {
                db.run(
                  `INSERT INTO employee_contracts 
                   (employee_id, year, month, dienstverband, hours_per_week, hourly_rate, vakantietoeslag_percentage, bonus_percentage)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [employeeId, currentYear, month, dienstverband, hours_per_week, hourly_rate, vakantietoeslag_percentage || 8, bonus_percentage || 0]
                );
              }

              // Create contracts for next year too
              for (let month = 1; month <= 12; month++) {
                db.run(
                  `INSERT INTO employee_contracts 
                   (employee_id, year, month, dienstverband, hours_per_week, hourly_rate, vakantietoeslag_percentage, bonus_percentage)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [employeeId, currentYear + 1, month, dienstverband, hours_per_week, hourly_rate, vakantietoeslag_percentage || 8, bonus_percentage || 0]
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
    WHERE u.is_active = 1
    ORDER BY u.name
  `;

  db.all(query, [currentYear, currentMonth, currentYear], (err, employees) => {
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
    WHERE u.id = ?
  `;

  db.get(query, [currentYear, currentMonth, currentYear, userId], (err, employee) => {
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
