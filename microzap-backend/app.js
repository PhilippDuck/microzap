const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const paymentRoutes = require("./routes/payments");
const checkPaymentRoutes = require("./routes/checkPayment");
const loggingMiddleware = require("./middleware/logging");
require("dotenv").config();

const app = express();
// CORS-Konfiguration für Entwicklung: Alle Origins erlauben
app.use(
  cors({
    origin: true, // Erlaubt alle Origins
    credentials: true, // Erlaubt Cookies (für HTTP-Only Cookie)
    methods: ["GET", "POST", "OPTIONS"], // Erlaubte Methoden
    allowedHeaders: ["Content-Type", "Authorization"], // Erlaubte Header
  })
);
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
