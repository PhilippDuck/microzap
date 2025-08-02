const express = require("express");
const QRCode = require("qrcode");
const lnurlServer = require("../lnurlServer");
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken"); // Neu: Für JWT-Generierung
const cookieParser = require("cookie-parser"); // Neu: Für Cookie-Handling

const router = express.Router();
router.use(cookieParser()); // Middleware für Cookies

// Lade JWT_SECRET aus .env oder verwende Fallback
const JWT_SECRET = process.env.JWT_SECRET || "dein-geheimer-key";

// Datenbankverbindung einrichten
const db = new sqlite3.Database("database.db", (err) => {
  if (err) {
    console.error("Fehler beim Öffnen der Datenbank:", err.message);
  } else {
    console.log("Verbindung zur SQLite-Datenbank hergestellt.");
    // Tabelle auth_requests erstellen, falls sie nicht existiert
    db.run(
      `
      CREATE TABLE IF NOT EXISTS auth_requests (
        k1 TEXT PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending',
        user_id TEXT
      )
    `,
      (err) => {
        if (err) {
          console.error("Fehler beim Erstellen der Tabelle:", err.message);
        }
      }
    );
  }
});

router.get("/lnurl-auth", async (req, res) => {
  try {
    const result = await lnurlServer.generateNewUrl("login");

    // Detailliertes Debugging des result-Objekts
    console.log(
      "LNURL-Auth Result (komplett):",
      JSON.stringify(result, null, 2)
    );

    // Überprüfen, ob secret vorhanden und nicht leer ist
    if (!result.secret || result.secret.trim() === "") {
      console.error(
        "Fehler: secret ist leer oder nicht vorhanden. Verfügbare Schlüssel:",
        Object.keys(result)
      );
      return res.status(500).json({
        error: "Fehler bei der Generierung von secret",
        availableKeys: Object.keys(result),
      });
    }

    const qrCode = await QRCode.toDataURL(result.encoded);

    // secret als k1 in der Datenbank speichern
    db.run(
      `INSERT INTO auth_requests (k1, status) VALUES (?, 'pending')`,
      [result.secret],
      (err) => {
        if (err) {
          console.error(
            `Fehler beim Speichern von secret (${result.secret}):`,
            err.message
          );
        } else {
          console.log(
            `secret ${result.secret} erfolgreich in auth_requests gespeichert.`
          );
        }
      }
    );

    // k1 (secret) an das Frontend zurückgeben
    res.json({ qrCode, url: result.url, k1: result.secret });
  } catch (error) {
    console.error("Fehler bei der Verarbeitung von /lnurl-auth:", error);
    res.status(500).json({ error: "Interner Serverfehler" });
  }
});

// Neuer Endpunkt zum Überprüfen des Login-Status
router.post("/login-status/:k1", (req, res) => {
  const k1 = req.params.k1;
  const paidArticlesFromBody = req.body.paidArticles || []; // Extrahiere paidArticles aus dem Body

  db.get(
    "SELECT status, user_id FROM auth_requests WHERE k1 = ?",
    [k1],
    (err, row) => {
      if (err) {
        console.error("[DB ERROR] Query failed:", {
          query: "SELECT status, user_id FROM auth_requests WHERE k1 = ?",
          params: [k1],
          error: err.message,
        });
        return res.status(500).json({ error: "Datenbankfehler" });
      }

      if (!row) {
        return res.status(404).json({
          status: "not_found",
          message: "k1 nicht gefunden oder abgelaufen",
        });
      }

      if (row.status === "success" && row.user_id) {
        // Generiere JWT mit user_id als sub
        const token = jwt.sign({ sub: row.user_id }, JWT_SECRET, {
          expiresIn: "1h",
        });

        // Setze HTTP-Only Cookie
        res.cookie("authToken", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 3600 * 1000,
        });

        // Hole den User aus der users-Tabelle
        db.get(
          "SELECT * FROM users WHERE id = ?",
          [row.user_id],
          (err, userRow) => {
            if (err) {
              console.error("[DB ERROR] Query failed:", {
                query: "SELECT * FROM users WHERE id = ?",
                params: [row.user_id],
                error: err.message,
              });
              return res.status(500).json({ error: "Datenbankfehler" });
            }

            let updatedPaidArticles = paidArticlesFromBody;

            if (userRow) {
              // User existiert: Kombiniere paid_articles aus DB und Body
              const dbPaidArticles = userRow.paid_articles
                ? JSON.parse(userRow.paid_articles)
                : [];

              // Kombiniere und vermeide Duplikate (basierend auf id)
              const combinedArticles = [...dbPaidArticles];
              const dbIds = new Set(
                dbPaidArticles.map((article) => article.id)
              );

              paidArticlesFromBody.forEach((newArticle) => {
                if (!dbIds.has(newArticle.id)) {
                  combinedArticles.push(newArticle);
                  dbIds.add(newArticle.id);
                }
              });

              updatedPaidArticles = combinedArticles;

              // Update DB mit kombinierten paid_articles
              db.run(
                "UPDATE users SET paid_articles = ? WHERE id = ?",
                [JSON.stringify(combinedArticles), row.user_id],
                (err) => {
                  if (err) {
                    console.error("[DB ERROR] Update failed:", {
                      query: "UPDATE users SET paid_articles = ? WHERE id = ?",
                      params: [JSON.stringify(combinedArticles), row.user_id],
                      error: err.message,
                    });
                    return res.status(500).json({ error: "Datenbankfehler" });
                  }
                  console.log(
                    `paid_articles für User ${row.user_id} aktualisiert.`
                  );
                }
              );
            } else {
              // User neu anlegen: Übernimm paidArticles aus Body
              db.run(
                "INSERT INTO users (id, paid_articles) VALUES (?, ?)",
                [row.user_id, JSON.stringify(paidArticlesFromBody)],
                (err) => {
                  if (err) {
                    console.error("[DB ERROR] Insert failed:", {
                      query:
                        "INSERT INTO users (id, paid_articles) VALUES (?, ?)",
                      params: [
                        row.user_id,
                        JSON.stringify(paidArticlesFromBody),
                      ],
                      error: err.message,
                    });
                    return res.status(500).json({ error: "Datenbankfehler" });
                  }
                  console.log(
                    `Neuer User ${row.user_id} mit paid_articles angelegt.`
                  );
                }
              );
            }

            // Sende Response mit status und aktualisierter paidArticles-Liste
            res.json({ status: "success", paidArticles: updatedPaidArticles });
          }
        );
      } else {
        res.json({ status: row.status });
      }
    }
  );
});

// Datenbankverbindung schließen, wenn der Prozess beendet wird
process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error("Fehler beim Schließen der Datenbank:", err.message);
    } else {
      console.log("Datenbankverbindung geschlossen.");
    }
    process.exit(0);
  });
});

module.exports = router;
