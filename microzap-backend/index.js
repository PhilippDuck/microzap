const express = require("express");
const axios = require("axios");
const QRCode = require("qrcode");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const uuid = require("uuid");
const lnurl = require("lnurl"); // Für LNURL Auth
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// LNURL-Server erstellen (basierend auf Doku)
const lnurlServer = lnurl.createServer({
  host: "localhost",
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

// Endpunkt zum Generieren eines LNURL-Auth-Strings
app.get("/lnurl-auth", async (req, res) => {
  const result = await lnurlServer.generateNewUrl("login");
  const qrCode = await QRCode.toDataURL(result.encoded);
  res.json({ qrCode, url: result.url });
  console.log(qrCode);
});

// Middleware für erweitertes Request-Logging
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
    headers: req.headers,
    timestamp: new Date().toISOString(),
  });
  next();
});

const LNBITS_URL = process.env.LNBITS_URL || "https://demo.lnbits.com";
const INVOICE_READ_KEY = process.env.INVOICE_READ_KEY;
const ADMIN_KEY = process.env.ADMIN_KEY; // Für Withdraw und Auth
const PAYMENT_AMOUNT = 1; // Betrag in Satoshis für Artikel
const PREMIUM_AMOUNT = 10; // Für Premium-Zugriff (z. B. 30 Tage)
const WITHDRAW_WINDOW = 24 * 60 * 60 * 1000; // 24 Stunden in ms für Rückerstattung

// SQLite-Datenbank einrichten mit Logging
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

// Endpunkt für Preisabfrage (mit Logging)
app.get("/get-price", (req, res) => {
  const { articleId } = req.query;
  console.debug("[GET /get-price] Query params:", { articleId });
  const price = articleId ? PAYMENT_AMOUNT : PREMIUM_AMOUNT;
  console.log("[GET /get-price] Returning price:", price);
  res.json({ amount: price });
});

// Endpunkt zum Erstellen einer Rechnung (erweitertes Logging)
app.post("/create-invoice", async (req, res) => {
  const { type, articleId } = req.body;
  let amount = type === "premium" ? PREMIUM_AMOUNT : PAYMENT_AMOUNT;
  let memo =
    type === "premium"
      ? "Premium-Zugriff"
      : `Freischaltung Artikel ${articleId}`;

  try {
    if (!INVOICE_READ_KEY) throw new Error("INVOICE_READ_KEY fehlt");

    const requestData = { amount, memo, out: false };
    const requestHeaders = {
      "Content-Type": "application/json",
      "X-Api-Key": INVOICE_READ_KEY,
    };

    console.debug("[POST /create-invoice] LNBits API Request:", {
      url: `${LNBITS_URL}/api/v1/payments`,
      data: requestData,
      headers: { ...requestHeaders, "X-Api-Key": "[REDACTED]" }, // API-Key maskiert
    });

    const response = await axios.post(
      `${LNBITS_URL}/api/v1/payments`,
      requestData,
      { headers: requestHeaders }
    );
    const { bolt11, payment_hash } = response.data;

    console.debug("[POST /create-invoice] LNBits API Response:", {
      status: response.status,
      data: { bolt11, payment_hash },
    });

    if (!bolt11) throw new Error("Ungültige bolt11");

    const qrCode = await QRCode.toDataURL(bolt11);
    res.json({ paymentRequest: bolt11, paymentHash: payment_hash, qrCode });
  } catch (error) {
    console.error(
      "[POST /create-invoice] Fehler beim Erstellen der Rechnung:",
      {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
      }
    );
    res
      .status(500)
      .json({ error: `Fehler beim Erstellen der Rechnung: ${error.message}` });
  }
});

// Endpunkt zum Überprüfen der Zahlung (erweitertes Logging)
app.get("/check-payment/:paymentHash", async (req, res) => {
  const { paymentHash } = req.params;
  const { userId, type, articleId } = req.query;

  try {
    if (!INVOICE_READ_KEY) throw new Error("INVOICE_READ_KEY fehlt");

    console.debug("[GET /check-payment] LNBits API Request:", {
      url: `${LNBITS_URL}/api/v1/payments/${paymentHash}`,
      headers: { "X-Api-Key": "[REDACTED]" },
    });

    const response = await axios.get(
      `${LNBITS_URL}/api/v1/payments/${paymentHash}`,
      {
        headers: { "X-Api-Key": INVOICE_READ_KEY },
      }
    );

    console.debug("[GET /check-payment] LNBits API Response:", {
      status: response.status,
      data: response.data,
    });

    const paid = response.data.paid;
    if (paid && userId) {
      console.log(
        "[GET /check-payment] Zahlung bestätigt, speichere Status in DB."
      );
      db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) {
          console.error("[DB ERROR] Query failed:", {
            query: "SELECT * FROM users WHERE id = ?",
            params: [userId],
            error: err.message,
          });
          throw err;
        }
        console.debug("[DB] Fetched row:", row);

        let paidArticles = row ? JSON.parse(row.paid_articles || "[]") : [];
        if (type === "article" && !paidArticles.includes(articleId)) {
          paidArticles.push(articleId);
        }

        const paidJson = JSON.stringify(paidArticles);
        const premiumStart =
          type === "premium" ? new Date().toISOString() : row?.premium_start;
        const premiumEnd =
          type === "premium"
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : row?.premium_end;

        if (row) {
          const updateQuery =
            "UPDATE users SET premium_start = ?, premium_end = ?, paid_articles = ?, payment_hash = ? WHERE id = ?";
          console.debug("[DB] Executing update query:", {
            query: updateQuery,
            params: [premiumStart, premiumEnd, paidJson, paymentHash, userId],
          });
          db.run(
            updateQuery,
            [premiumStart, premiumEnd, paidJson, paymentHash, userId],
            (err) => {
              if (err) console.error("[DB ERROR] Update failed:", err.message);
              else console.log("[DB] Update successful.");
            }
          );
        } else {
          const insertQuery =
            "INSERT INTO users (id, premium_start, premium_end, paid_articles, payment_hash) VALUES (?, ?, ?, ?, ?)";
          console.debug("[DB] Executing insert query:", {
            query: insertQuery,
            params: [userId, premiumStart, premiumEnd, paidJson, paymentHash],
          });
          db.run(
            insertQuery,
            [userId, premiumStart, premiumEnd, paidJson, paymentHash],
            (err) => {
              if (err) console.error("[DB ERROR] Insert failed:", err.message);
              else console.log("[DB] Insert successful.");
            }
          );
        }
      });
    } else {
      console.log(
        "[GET /check-payment] Keine userId, DB-Speicherung übersprungen."
      );
    }

    res.json({ paid });
  } catch (error) {
    console.error("[GET /check-payment] Fehler beim Überprüfen der Zahlung:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    res
      .status(500)
      .json({ error: `Fehler beim Überprüfen der Zahlung: ${error.message}` });
  }
});

// Server starten
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[START] Server läuft auf Port ${PORT}`);
});
