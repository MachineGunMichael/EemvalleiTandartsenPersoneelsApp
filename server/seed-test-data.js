const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "database.sqlite");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
    process.exit(1);
  }
  console.log("Connected to SQLite database.");
});

// Create holiday_transactions table if not exists
db.run(`
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
`, (err) => {
  if (err) console.log("Table may already exist:", err.message);
  else console.log("Holiday transactions table ready.");
});

// Find a Test user employee_id
db.get(`
  SELECT e.id as employee_id, u.name 
  FROM employees e 
  JOIN users u ON e.user_id = u.id 
  WHERE u.name LIKE '%Test%' 
  LIMIT 1
`, [], (err, row) => {
  if (err || !row) {
    console.log("No Test user found, using employee_id 1 (Duygu)");
    insertTestData(1, "Duygu Kandemir");
  } else {
    console.log(`Found Test user: ${row.name} (employee_id: ${row.employee_id})`);
    insertTestData(row.employee_id, row.name);
  }
});

function insertTestData(employeeId, employeeName) {
  console.log(`\nInserting test holiday transactions for ${employeeName}...`);

  // Clear existing transactions for this employee
  db.run("DELETE FROM holiday_transactions WHERE employee_id = ?", [employeeId], (err) => {
    if (err) console.error("Error clearing transactions:", err.message);
  });

  // 2025 holiday transaction data - simulating a year of vacation usage
  const transactions2025 = [
    // Initial hours at start of year
    { date: "2025-01-01", type: "added", hours: 120, desc: "Jaarlijkse vakantie-uren toegekend" },
    // Used throughout the year
    { date: "2025-02-14", type: "used", hours: 8, desc: "Valentijnsdag vrij" },
    { date: "2025-03-21", type: "used", hours: 16, desc: "Voorjaarsvakantie" },
    { date: "2025-04-21", type: "used", hours: 8, desc: "Dag na Pasen" },
    // Extra hours added
    { date: "2025-05-01", type: "added", hours: 16, desc: "Overwerk compensatie" },
    { date: "2025-05-26", type: "used", hours: 8, desc: "Dag na Hemelvaart" },
    { date: "2025-06-16", type: "used", hours: 24, desc: "Zomervakantie week 1" },
    { date: "2025-07-07", type: "used", hours: 40, desc: "Zomervakantie week 2" },
    { date: "2025-07-21", type: "used", hours: 8, desc: "Extra zomerdag" },
    // More additions
    { date: "2025-08-01", type: "added", hours: 8, desc: "Bonus vakantiedag" },
    { date: "2025-09-15", type: "used", hours: 8, desc: "Doktersbezoek" },
    { date: "2025-10-20", type: "used", hours: 8, desc: "Herfstvakantie" },
    { date: "2025-11-28", type: "used", hours: 8, desc: "Black Friday vrij" },
    { date: "2025-12-24", type: "used", hours: 16, desc: "Kerstvakantie" },
  ];

  let runningBalance = 0;
  let availableHours = 0;
  let usedHours = 0;

  const insertTransaction = (idx) => {
    if (idx >= transactions2025.length) {
      // Update employee_holidays after all transactions
      db.run(`
        INSERT OR REPLACE INTO employee_holidays (employee_id, year, available_hours, used_hours, updated_at)
        VALUES (?, 2025, ?, ?, CURRENT_TIMESTAMP)
      `, [employeeId, availableHours, usedHours], (err) => {
        if (err) console.error("Error updating holidays:", err.message);
        else console.log(`Updated holidays: available=${availableHours}, used=${usedHours}, balance=${runningBalance}`);
        
        console.log("\n" + "=".repeat(50));
        console.log("TEST DATA SEEDED SUCCESSFULLY");
        console.log("=".repeat(50));
        
        setTimeout(() => {
          db.close();
          process.exit(0);
        }, 500);
      });
      return;
    }

    const t = transactions2025[idx];
    
    if (t.type === "added") {
      availableHours += t.hours;
      runningBalance += t.hours;
    } else {
      usedHours += t.hours;
      runningBalance -= t.hours;
    }

    db.run(`
      INSERT INTO holiday_transactions (employee_id, year, transaction_date, type, hours, description, balance_after)
      VALUES (?, 2025, ?, ?, ?, ?, ?)
    `, [employeeId, t.date, t.type, t.hours, t.desc, runningBalance], (err) => {
      if (err) {
        console.error(`Error inserting transaction ${idx}:`, err.message);
      } else {
        console.log(`  ${t.date}: ${t.type === 'added' ? '+' : '-'}${t.hours} uren (${t.desc}) → Balance: ${runningBalance}`);
      }
      insertTransaction(idx + 1);
    });
  };

  // Start inserting
  setTimeout(() => insertTransaction(0), 100);
}

