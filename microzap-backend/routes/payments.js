const express = require("express");
const axios = require("axios");
const QRCode = require("qrcode");
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const lnurlServer = require("../lnurlServer");
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
  const type = req.query.type; // Hole den Typ (z. B. "premium" oder etwas anderes für Artikel)
  const token = req.cookies.authToken;
  let userId = null; // User-ID nur bei Bedarf setzen

  try {
    // Authentifizierung nur für Premium-Käufe erforderlich
    if (type === "premium") {
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.sub;
      console.log("[GET /check-payment] User ID:", userId);
    }

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

    if (paymentData.paid && type === "premium") {
      // Aktualisiere Premium-Status nur bei erfolgreicher Zahlung für Premium
      const premiumStart = new Date().toISOString(); // z. B. 04.08.2025
      const premiumEnd = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(); // z. B. 03.09.2025

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
          console.log(`Premium für User ${userId} aktiviert bis ${premiumEnd}`);
        }
      );
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

// Nun der API-Endpunkt: POST /initiate-premium-refund
router.post("/initiate-premium-refund", (req, res) => {
  const token = req.cookies.authToken;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.sub;

    // Optional: Überprüfe Premium-Status und 24h-Frist (redundant zum Frontend, aber sicher)
    db.get(
      "SELECT premium_start FROM users WHERE id = ?",
      [userId],
      (err, row) => {
        if (err || !row) {
          return res
            .status(500)
            .json({ error: "Datenbankfehler oder User nicht gefunden" });
        }
        const premiumStart = row.premium_start
          ? new Date(row.premium_start)
          : null;
        if (
          !premiumStart ||
          Date.now() - premiumStart.getTime() >= 24 * 60 * 60 * 1000
        ) {
          return res
            .status(403)
            .json({ error: "Rückerstattung nicht möglich" });
        }

        // Generiere Withdraw-Request
        const tag = "withdrawRequest";
        const params = {
          minWithdrawable: PREMIUM_AMOUNT * 1000, // msats (angenommen PREMIUM_AMOUNT in sat)
          maxWithdrawable: PREMIUM_AMOUNT * 1000,
          defaultDescription: "Premium Rückerstattung",
        };
        const options = { uses: 1 }; // Einmalig

        lnurlServer
          .generateNewUrl(tag, params, options)
          .then(async (result) => {
            const { encoded: lnurlString, secret } = result;
            console.log("lnurlstring: " + lnurlString);
            // Speichere secret mit userId in DB für späteren Lookup im Event
            db.run(
              "INSERT INTO withdraw_secrets (secret, user_id) VALUES (?, ?)",
              [secret, userId],
              (insertErr) => {
                if (insertErr) {
                  console.error("Error saving secret:", insertErr);
                  return res
                    .status(500)
                    .json({ error: "Fehler beim Speichern" });
                }
              }
            );

            // Generiere QR-Code als Base64-URL
            let qrCodeUrl;
            try {
              qrCodeUrl = await QRCode.toDataURL(lnurlString, {
                width: 256,
                errorCorrectionLevel: "H",
              });
            } catch (qrErr) {
              console.error("Error generating QR:", qrErr);
              return res
                .status(500)
                .json({ error: "Fehler beim Generieren des QR-Codes" });
            }

            res.json({ lnurl: lnurlString, qrCodeUrl });
          })
          .catch((error) => {
            console.error("Error generating LNURL:", error);
            res
              .status(500)
              .json({ error: "Fehler beim Generieren der Withdraw-Request" });
          });
      }
    );
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    res.status(401).json({ error: "Invalid token" });
  }
});

// Global Event-Handler für erfolgreichen Withdraw (deaktiviere Premium)
lnurlServer.on("withdrawRequest:action:processed", (event) => {
  const { secret } = event;
  // Lookup in DB: Angenommen, du hast eine Tabelle 'withdraw_secrets' mit secret und user_id
  db.get(
    "SELECT user_id FROM withdraw_secrets WHERE secret = ?",
    [secret],
    (err, row) => {
      if (err || !row) {
        console.error("Error finding user for secret:", err || "No row");
        return;
      }
      const userId = row.user_id;
      db.run(
        "UPDATE users SET premium_start = NULL, premium_end = NULL WHERE id = ?",
        [userId],
        (updateErr) => {
          if (updateErr) {
            console.error("Error deactivating premium:", updateErr);
          } else {
            console.log(`Premium deaktiviert für User ${userId} nach Withdraw`);
            // Optional: Lösche den Eintrag
            db.run("DELETE FROM withdraw_secrets WHERE secret = ?", [secret]);
          }
        }
      );
    }
  );
});

module.exports = router;
