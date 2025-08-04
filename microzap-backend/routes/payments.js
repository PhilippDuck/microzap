const express = require("express");
const axios = require("axios");
const QRCode = require("qrcode");
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const {
  LNBITS_URL,
  INVOICE_READ_KEY,
  PAYMENT_AMOUNT,
  PREMIUM_AMOUNT,
} = require("../config");

const router = express.Router();
router.use(cookieParser());

// Lade JWT_SECRET aus .env oder verwende Fallback
const JWT_SECRET = process.env.JWT_SECRET || "dein-geheimer-key";

// Datenbankverbindung einrichten
const db = new sqlite3.Database("database.db", (err) => {
  if (err) {
    console.error("Fehler beim Öffnen der Datenbank:", err.message);
  } else {
    console.log("Verbindung zur SQLite-Datenbank hergestellt.");
    db.run(
      `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        premium_start TIMESTAMP,
        premium_end TIMESTAMP,
        paid_articles TEXT,
        payment_hash TEXT
      )
    `,
      (err) => {
        if (err) {
          console.error(
            "Fehler beim Erstellen der users-Tabelle:",
            err.message
          );
        }
      }
    );
  }
});

router.get("/get-price", (req, res) => {
  const { articleId } = req.query;
  console.debug("[GET /get-price] Query params:", { articleId });
  const price = articleId ? PAYMENT_AMOUNT : PREMIUM_AMOUNT;
  console.log("[GET /get-price] Returning price:", price);
  res.json({ amount: price });
});

router.post("/create-invoice", async (req, res) => {
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
      headers: { ...requestHeaders, "X-Api-Key": "[REDACTED]" },
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

// Neue Schnittstelle: GET /check-payment/:hash
router.get("/check-payment/:hash", async (req, res) => {
  const { hash } = req.params;
  const token = req.cookies.authToken;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.sub;
    console.log("[GET /check-payment] User ID:", userId);

    const requestHeaders = {
      "X-Api-Key": INVOICE_READ_KEY,
    };
    const paymentResponse = await axios.get(
      `${LNBITS_URL}/api/v1/payments/${hash}`,
      { headers: requestHeaders }
    );
    const paymentData = paymentResponse.data;

    console.log("[GET /check-payment] LNBits API Response:", {
      status: paymentResponse.status,
      data: paymentData,
    });

    if (paymentData.paid) {
      // Aktualisiere Premium-Status bei erfolgreicher Zahlung für Premium
      if (req.query.type === "premium") {
        const premiumStart = new Date().toISOString(); // 04.08.2025
        const premiumEnd = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(); // 03.09.2025

        db.run(
          "UPDATE users SET premium_start = ?, premium_end = ? WHERE id = ?",
          [premiumStart, premiumEnd, userId],
          (err) => {
            if (err) {
              console.error("[DB ERROR] Update failed:", {
                query:
                  "UPDATE users SET premium_start = ?, premium_end = ? WHERE id = ?",
                params: [premiumStart, premiumEnd, userId],
                error: err.message,
              });
              return res.status(500).json({ error: "Datenbankfehler" });
            }
            console.log(
              `Premium für User ${userId} aktiviert bis ${premiumEnd}`
            );
          }
        );
      }
    }

    res.json({ paid: paymentData.paid });
  } catch (err) {
    console.error("Error checking payment:", err.message);
    if (err.name === "JsonWebTokenError") {
      res.status(401).json({ error: "Invalid token" });
    } else {
      res.status(500).json({ error: "Fehler beim Überprüfen der Zahlung" });
    }
  }
});

module.exports = router;
