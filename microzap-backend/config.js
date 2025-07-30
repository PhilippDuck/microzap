require("dotenv").config();

module.exports = {
  LNBITS_URL: process.env.LNBITS_URL || "https://demo.lnbits.com",
  INVOICE_READ_KEY: process.env.INVOICE_READ_KEY,
  ADMIN_KEY: process.env.ADMIN_KEY,
  PAYMENT_AMOUNT: 1,
  PREMIUM_AMOUNT: 10,
  WITHDRAW_WINDOW: 24 * 60 * 60 * 1000,
};
