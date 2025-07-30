const lnurl = require("lnurl");
const uuid = require("uuid");
const db = require("./database");

const lnurlServer = lnurl.createServer({
  host: "localhost",
  url: "https://aeaea10b2889.ngrok-free.app",
  port: 3005,
  auth: {
    apiKeys: [
      {
        id: uuid.v4(),
        key: uuid.v4(),
        encoding: "hex",
      },
    ],
  },
  lightning: {
    backend: "dummy",
    config: {},
  },
});

lnurlServer.on("login", (login) => {
  console.log("key: " + login.key);
  console.log("hash: " + login.hash);

  // Überprüfen, ob der User (basierend auf key) bereits in der DB existiert
  db.get("SELECT * FROM users WHERE id = ?", [login.key], (err, row) => {
    if (err) {
      console.error("[DB ERROR] Query failed:", {
        query: "SELECT * FROM users WHERE id = ?",
        params: [login.key],
        error: err.message,
      });
      return;
    }
    if (!row) {
      // User existiert nicht, neuen User anlegen mit Default-Werten
      const insertQuery =
        "INSERT INTO users (id, premium_start, premium_end, paid_articles, payment_hash) VALUES (?, NULL, NULL, ?, NULL)";
      const paidArticlesJson = JSON.stringify([]);
      console.debug("[DB] Executing insert query for new user:", {
        query: insertQuery,
        params: [login.key, paidArticlesJson],
      });
      db.run(insertQuery, [login.key, paidArticlesJson], (err) => {
        if (err) {
          console.error("[DB ERROR] Insert failed:", err.message);
        } else {
          console.log("[DB] New user inserted successfully.");
        }
      });
    } else {
      console.log("[DB] User already exists.");
    }
  });
});

module.exports = lnurlServer;
