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

// Dieser Endpunkt erstellt eine Lightning-Rechnung über die LNBits-API.
// Er verarbeitet Anfragen für Premium-Zugriff oder die Freischaltung eines spezifischen Artikels,
// generiert den entsprechenden Betrag und Memo, sendet eine POST-Anfrage an LNBits,
// extrahiert den Payment Request (bolt11) und Hash, erstellt einen QR-Code und gibt diese Daten als JSON zurück.
// Im Fehlerfall wird ein 500-Status mit einer Fehlermeldung gesendet.
router.post("/create-invoice", async (req, res) => {
  // Extrahiere Typ und Artikel-ID aus dem Request-Body
  const { type, articleId } = req.body;
  // Bestimme den Betrag basierend auf dem Typ (premium oder standard)
  let amount = type === "premium" ? PREMIUM_AMOUNT : PAYMENT_AMOUNT;
  // Erstelle eine Beschreibung (Memo) für die Rechnung, abhängig vom Typ
  let memo =
    type === "premium"
      ? "Premium-Zugriff" // Für Premium-Zugang
      : `Freischaltung Artikel ${articleId}`; // Für die Freischaltung eines spezifischen Artikels
  try {
    // Überprüfe, ob der API-Schlüssel für LNBits vorhanden ist
    if (!INVOICE_READ_KEY) throw new Error("INVOICE_READ_KEY fehlt");
    // Bereite die Anfragedaten für die LNBits-API vor
    const requestData = { amount, memo, out: false }; // out: false bedeutet,
    //  es handelt sich um eine eingehende Zahlung (Rechnung)
    // Definiere die HTTP-Header für die API-Anfrage
    const requestHeaders = {
      "Content-Type": "application/json",
      "X-Api-Key": INVOICE_READ_KEY,
    };
    // Logge die API-Anfrage für Debugging-Zwecke (sensibler Key wird redigiert)
    console.debug("[POST /create-invoice] LNBits API Request:", {
      url: `${LNBITS_URL}/api/v1/payments`,
      data: requestData,
      headers: { ...requestHeaders, "X-Api-Key": "[REDACTED]" },
    });
    // Sende eine POST-Anfrage an die LNBits-API, um die Rechnung zu erstellen
    const response = await axios.post(
      `${LNBITS_URL}/api/v1/payments`,
      requestData,
      { headers: requestHeaders }
    );
    // Extrahiere bolt11 (Payment Request) und payment_hash aus der API-Antwort
    const { bolt11, payment_hash } = response.data;
    // Logge die API-Antwort für Debugging
    console.debug("[POST /create-invoice] LNBits API Response:", {
      status: response.status,
      data: { bolt11, payment_hash },
    });
    // Überprüfe, ob ein gültiger bolt11 vorhanden ist
    if (!bolt11) throw new Error("Ungültige bolt11");
    // Generiere einen QR-Code aus dem bolt11-String als Data-URL
    const qrCode = await QRCode.toDataURL(bolt11);
    // Sende die Rechnungsdaten als JSON-Antwort zurück (Payment Request, Hash und QR-Code)
    res.json({ paymentRequest: bolt11, paymentHash: payment_hash, qrCode });
  } catch (error) {
    // Logge den Fehler detailliert für Debugging
    console.error(
      "[POST /create-invoice] Fehler beim Erstellen der Rechnung:",
      {
        message: error.message,
        stack: error.stack,
        response: error.response?.data, // Falls eine API-Antwort vorhanden ist
      }
    );

    // Sende eine Fehlerantwort mit Status 500 zurück
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
            // Speichere secret mit userId und status 'polling' in DB
            db.run(
              "INSERT INTO withdraw_secrets (secret, user_id, status) VALUES (?, ?, 'polling')",
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

            // Setze Status auf 'success' für diesen Eintrag
            db.run(
              "UPDATE withdraw_secrets SET status = 'success' WHERE secret = ?",
              [secret],
              (statusErr) => {
                if (statusErr) {
                  console.error("Error updating status to success:", statusErr);
                }
              }
            );

            // Lösche alle 'polling'-Einträge, die älter als 5 Minuten sind
            const fiveMinutesAgo = new Date(
              Date.now() - 5 * 60 * 1000
            ).toISOString();
            db.run(
              "DELETE FROM withdraw_secrets WHERE status = 'polling' AND created_at < ?",
              [fiveMinutesAgo],
              (deleteErr) => {
                if (deleteErr) {
                  console.error(
                    "Error deleting old polling entries:",
                    deleteErr
                  );
                } else {
                  console.log("Alte polling-Einträge gelöscht");
                }
              }
            );
          }
        }
      );
    }
  );
});

router.get("/check-withdraw-status", (req, res) => {
  const token = req.cookies.authToken;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.sub;

    db.get(
      "SELECT premium_end FROM users WHERE id = ?",
      [userId],
      (err, row) => {
        if (err || !row)
          return res.status(500).json({ error: "Datenbankfehler" });
        res.json({ withdrawn: row.premium_end === null });
      }
    );
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;
