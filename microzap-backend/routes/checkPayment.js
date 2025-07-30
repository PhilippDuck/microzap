const express = require("express");
const axios = require("axios");
const db = require("../database");
const { LNBITS_URL, INVOICE_READ_KEY, PREMIUM_AMOUNT } = require("../config");

const router = express.Router();

router.get("/check-payment/:paymentHash", async (req, res) => {
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

module.exports = router;
