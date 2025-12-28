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

    // Compare passwords
    const isValidPassword = bcrypt.compareSync(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Ongeldige inloggegevens" });
    }

    // Return user data (without password)
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  });
});

// Get all users (admin only - for future use)
app.get("/api/users", (req, res) => {
  db.all("SELECT id, email, name, role, created_at FROM users", [], (err, users) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Er is een serverfout opgetreden" });
    }
    res.json(users);
  });
});

// Create new user (admin only - for future use)
app.post("/api/users", (req, res) => {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ message: "Alle velden zijn verplicht" });
  }

  if (!["admin", "manager", "employee"].includes(role)) {
    return res.status(400).json({ message: "Ongeldige rol" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)",
    [email.toLowerCase(), hashedPassword, name, role],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          return res.status(400).json({ message: "E-mailadres is al in gebruik" });
        }
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Er is een serverfout opgetreden" });
      }

      res.status(201).json({
        id: this.lastID,
        email: email.toLowerCase(),
        name,
        role,
      });
    }
  );
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

