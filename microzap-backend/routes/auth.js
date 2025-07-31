const express = require("express");
const QRCode = require("qrcode");
const lnurlServer = require("../lnurlServer");
const sqlite3 = require("sqlite3").verbose();

const router = express.Router();

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
router.get("/login-status/:k1", (req, res) => {
  const k1 = req.params.k1;

  db.get("SELECT status FROM auth_requests WHERE k1 = ?", [k1], (err, row) => {
    if (err) {
      console.error("[DB ERROR] Query failed:", {
        query: "SELECT status FROM auth_requests WHERE k1 = ?",
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

    res.json({ status: row.status });
  });
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
