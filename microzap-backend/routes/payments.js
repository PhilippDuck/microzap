const express = require("express");
const axios = require("axios");
const QRCode = require("qrcode");
const {
  LNBITS_URL,
  INVOICE_READ_KEY,
  PAYMENT_AMOUNT,
  PREMIUM_AMOUNT,
} = require("../config");

const router = express.Router();

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

module.exports = router;
