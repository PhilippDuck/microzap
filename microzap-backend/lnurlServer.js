const lnurl = require("lnurl");
const uuid = require("uuid");
const db = require("./database");
const crypto = require("crypto");

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

  // Alle k1 aus der Tabelle auth_requests abrufen
  db.all("SELECT k1 FROM auth_requests", [], (err, rows) => {
    if (err) {
      console.error("[DB ERROR] Query failed:", {
        query: "SELECT k1 FROM auth_requests",
        error: err.message,
      });
      return;
    }

    let matchFound = false;
    let matchedK1 = null;

    // Durch alle k1 iterieren und Hash vergleichen
    rows.forEach((row) => {
      const k1 = row.k1;
      // k1 (Hex-String) in Bytes umwandeln
      const k1Bytes = Buffer.from(k1, "hex");
      // SHA-256 Hash berechnen
      const computedHash = crypto
        .createHash("sha256")
        .update(k1Bytes)
        .digest("hex");

      if (computedHash === login.hash) {
        matchFound = true;
        matchedK1 = k1;
        console.log(`Hash-Match gefunden für k1: ${k1}`);
      }
    });

    if (!matchFound) {
      console.error("Kein passender Hash gefunden. Login fehlgeschlagen.");
      return;
    }

    // Login erfolgreich: User überprüfen und ggf. einfügen
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

    // Den genutzten k1 aus der DB löschen, um Replay-Attacks zu verhindern
    if (matchedK1) {
      db.run("DELETE FROM auth_requests WHERE k1 = ?", [matchedK1], (err) => {
        if (err) {
          console.error(
            `[DB ERROR] Löschen von k1 (${matchedK1}) fehlgeschlagen:`,
            err.message
          );
        } else {
          console.log(
            `k1 ${matchedK1} erfolgreich aus auth_requests gelöscht.`
          );
        }
      });
    }
  });
});

module.exports = lnurlServer;
