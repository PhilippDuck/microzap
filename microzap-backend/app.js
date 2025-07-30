const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const paymentRoutes = require("./routes/payments");
const checkPaymentRoutes = require("./routes/checkPayment");
const loggingMiddleware = require("./middleware/logging");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(loggingMiddleware);

// Routen einbinden
app.use(authRoutes);
app.use(paymentRoutes);
app.use(checkPaymentRoutes);

// Server starten
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[START] Server läuft auf Port ${PORT}`);
});
