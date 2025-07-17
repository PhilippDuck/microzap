const express = require("express");
const axios = require("axios");
const QRCode = require("qrcode");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const uuid = require("uuid");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const LNBITS_URL = process.env.LNBITS_URL || "https://demo.lnbits.com";
const INVOICE_READ_KEY = process.env.INVOICE_READ_KEY;
const ADMIN_KEY = process.env.ADMIN_KEY; // Für Withdraw und Auth
const PAYMENT_AMOUNT = 1; // Betrag in Satoshis für Artikel
const PREMIUM_AMOUNT = 10; // Für Premium-Zugriff (z. B. 30 Tage)
const WITHDRAW_WINDOW = 24 * 60 * 60 * 1000; // 24 Stunden in ms für Rückerstattung

// SQLite-Datenbank einrichten
const db = new sqlite3.Database(process.env.DATABASE_PATH || "./database.db");
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      premium_start DATETIME,
      premium_end DATETIME,
      paid_articles TEXT,  -- JSON-Array von Article-IDs
      payment_hash TEXT
    )
  `);
});

// In microzap-backend/index.js
app.get("/get-price", (req, res) => {
  const { articleId } = req.query;
  // Mock-Logik: Preis basierend auf Article-ID (kann später mit DB erweitert werden)
  const price = articleId ? PAYMENT_AMOUNT : PREMIUM_AMOUNT; // Beispiel: 10 Satoshis für Artikel, 1000 für Premium
  res.json({ amount: price });
});

// Endpunkt zum Erstellen einer Rechnung (für Artikel oder Premium)
app.post("/create-invoice", async (req, res) => {
  const { type, articleId } = req.body; // type: 'article' oder 'premium'
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

    console.log("LNBits API Request (/create-invoice):", {
      url: `${LNBITS_URL}/api/v1/payments`,
      data: requestData,
    });

    const response = await axios.post(
      `${LNBITS_URL}/api/v1/payments`,
      requestData,
      { headers: requestHeaders }
    );
    const { bolt11, payment_hash } = response.data;

    if (!bolt11) throw new Error("Ungültige bolt11");

    const qrCode = await QRCode.toDataURL(bolt11);
    res.json({ paymentRequest: bolt11, paymentHash: payment_hash, qrCode });
  } catch (error) {
    console.error("Fehler beim Erstellen der Rechnung:", error.message);
    res
      .status(500)
      .json({ error: `Fehler beim Erstellen der Rechnung: ${error.message}` });
  }
});

// Endpunkt zum Überprüfen der Zahlung und Speichern des Status
app.get("/check-payment/:paymentHash", async (req, res) => {
  const { paymentHash } = req.params;
  const { userId, type, articleId } = req.query; // userId von LNURL-auth, type: 'article' oder 'premium'

  try {
    if (!INVOICE_READ_KEY) throw new Error("INVOICE_READ_KEY fehlt");

    const response = await axios.get(
      `${LNBITS_URL}/api/v1/payments/${paymentHash}`,
      {
        headers: { "X-Api-Key": INVOICE_READ_KEY },
      }
    );

    const paid = response.data.paid;
    if (paid) {
      // Status in DB speichern
      db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) throw err;

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
          db.run(
            "UPDATE users SET premium_start = ?, premium_end = ?, paid_articles = ?, payment_hash = ? WHERE id = ?",
            [premiumStart, premiumEnd, paidJson, paymentHash, userId]
          );
        } else {
          db.run(
            "INSERT INTO users (id, premium_start, premium_end, paid_articles, payment_hash) VALUES (?, ?, ?, ?, ?)",
            [userId, premiumStart, premiumEnd, paidJson, paymentHash]
          );
        }
      });
    }

    res.json({ paid });
  } catch (error) {
    console.error("Fehler beim Überprüfen der Zahlung:", error.message);
    res
      .status(500)
      .json({ error: `Fehler beim Überprüfen der Zahlung: ${error.message}` });
  }
});

// Server starten
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
