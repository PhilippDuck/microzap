const lnurl = require("lnurl");
const uuid = require("uuid");
const db = require("./database");
const crypto = require("crypto");
require("dotenv").config();

const lnurlServer = lnurl.createServer({
  host: "localhost",
  url: "https://a85544e66d78.ngrok-free.app",
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
    backend: "lnbits",
    config: {
      baseUrl: process.env.LNBITS_URL,
      adminKey: process.env.ADMIN_KEY,
    },
  },
});

lnurlServer.on("login", (login) => {
  console.log("key: " + login.key);
  console.log("hash: " + login.hash);

  // Alle k1, status und created_at aus der Tabelle auth_requests abrufen
  db.all(
    "SELECT k1, status, created_at FROM auth_requests",
    [],
    (err, rows) => {
      if (err) {
        console.error("[DB ERROR] Query failed:", {
          query: "SELECT k1, status, created_at FROM auth_requests",
          error: err.message,
        });
        return;
      }

      let matchFound = false;
      let matchedK1 = null;

      // Durch alle k1 iterieren, alte pending-Einträge löschen und Hash vergleichen
      rows.forEach((row) => {
        const k1 = row.k1;
        const status = row.status;
        const createdAt = row.created_at;

        // Prüfen, ob der Eintrag 'pending' ist und älter als 5 Minuten
        if (status === "pending") {
          db.get(
            "SELECT k1 FROM auth_requests WHERE k1 = ? AND created_at < datetime('now', '-5 minutes')",
            [k1],
            (err, expiredRow) => {
              if (err) {
                console.error(
                  "[DB ERROR] Check for expired pending request failed:",
                  {
                    query:
                      "SELECT k1 FROM auth_requests WHERE k1 = ? AND created_at < datetime('now', '-5 minutes')",
                    params: [k1],
                    error: err.message,
                  }
                );
                return;
              }
              if (expiredRow) {
                db.run(
                  "DELETE FROM auth_requests WHERE k1 = ?",
                  [k1],
                  (err) => {
                    if (err) {
                      console.error(
                        `[DB ERROR] Löschen von k1 (${k1}) fehlgeschlagen:`,
                        err.message
                      );
                    } else {
                      console.log(`Altes pending k1 ${k1} gelöscht.`);
                    }
                  }
                );
              }
            }
          );
        }

        const k1Bytes = Buffer.from(k1, "hex");
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

      // Status auf 'success' setzen
      db.run(
        "UPDATE auth_requests SET status = 'success' WHERE k1 = ?",
        [matchedK1],
        (err) => {
          if (err) {
            console.error(
              `[DB ERROR] Status-Update für k1 (${matchedK1}) fehlgeschlagen:`,
              err.message
            );
          } else {
            console.log(`Status für k1 ${matchedK1} auf 'success' gesetzt.`);
          }
        }
      );

      // User-ID mit der Request verknüpfen
      db.run(
        "UPDATE auth_requests SET user_id = ? WHERE k1 = ?",
        [login.key, matchedK1],
        (err) => {
          if (err) {
            console.error(
              `[DB ERROR] User-ID-Update für k1 (${matchedK1}) fehlgeschlagen:`,
              err.message
            );
          } else {
            console.log(`User-ID ${login.key} für k1 ${matchedK1} verknüpft.`);
          }
        }
      );

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
    }
  );
});

module.exports = lnurlServer;
