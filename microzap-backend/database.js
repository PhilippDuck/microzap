const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database(process.env.DATABASE_PATH || "./database.db");

db.serialize(() => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      premium_start DATETIME,
      premium_end DATETIME,
      paid_articles TEXT,  -- JSON-Array von Article-IDs
      payment_hash TEXT
    )
  `;
  console.debug("[DB] Executing query:", query);
  db.run(query, (err) => {
    if (err) console.error("[DB ERROR] Create table failed:", err.message);
    else console.log("[DB] Table 'users' ready.");
  });
});

// Erstelle die Tabelle, falls nicht vorhanden (in deiner DB-Init)
db.run(`
  CREATE TABLE IF NOT EXISTS withdraw_secrets (
    secret TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'polling',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP 
  )
`);

module.exports = db;
