const express = require("express");
const QRCode = require("qrcode");
const axios = require("axios");
const lnurlServer = require("../lnurlServer");
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { LNBITS_URL, INVOICE_READ_KEY } = require("../config");
require("dotenv").config();

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
      CREATE TABLE IF NOT EXISTS auth_requests (
        k1 TEXT PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending',
        user_id TEXT
      )
    `,
      (err) => {
        if (err) {
          console.error("Fehler beim Erstellen der Tabelle:", err.message);
        }
      }
    );
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

router.get("/lnurl-auth", async (req, res) => {
  try {
    const result = await lnurlServer.generateNewUrl("login");
    console.log("LNURL-Auth Result:", JSON.stringify(result, null, 2));

    if (!result.secret || result.secret.trim() === "") {
      console.error("Fehler: secret ist leer oder nicht vorhanden.");
      return res.status(500).json({
        error: "Fehler bei der Generierung von secret",
        availableKeys: Object.keys(result),
      });
    }

    const qrCode = await QRCode.toDataURL(result.encoded);
    db.run(
      `INSERT INTO auth_requests (k1, status) VALUES (?, 'pending')`,
      [result.secret],
      (err) => {
        if (err) {
          console.error(
            `Fehler beim Speichern von secret (${result.secret}):`,
            err.message
          );
        } else {
          console.log(
            `secret ${result.secret} erfolgreich in auth_requests gespeichert.`
          );
        }
      }
    );

    res.json({ qrCode, url: result.url, k1: result.secret });
  } catch (error) {
    console.error("Fehler bei der Verarbeitung von /lnurl-auth:", error);
    res.status(500).json({ error: "Interner Serverfehler" });
  }
});

router.get("/login-status/:k1", (req, res) => {
  const k1 = req.params.k1;

  db.get(
    "SELECT status, user_id FROM auth_requests WHERE k1 = ?",
    [k1],
    (err, row) => {
      if (err) {
        console.error("[DB ERROR] Query failed:", {
          query: "SELECT status, user_id FROM auth_requests WHERE k1 = ?",
          params: [k1],
          error: err.message,
        });
        return res.status(500).json({ error: "Datenbankfehler" });
      }

      if (!row) {
        return res.status(404).json({
          status: "not_found",
          message: "k1 nicht gefunden oder abgelaufen",
        });
      }

      if (row.status === "success" && row.user_id) {
        const token = jwt.sign({ sub: row.user_id }, JWT_SECRET, {
          expiresIn: "1h",
        });

        res.cookie("authToken", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 3600 * 1000,
        });

        res.json({ status: "success" });
      } else {
        res.json({ status: row.status });
      }
    }
  );
});

router.post("/paidArticles", (req, res) => {
  const token = req.cookies.authToken;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.sub;

    const paidArticlesFromBody = req.body.paidArticles || [];

    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, userRow) => {
      if (err) {
        console.error("[DB ERROR] Query failed:", {
          query: "SELECT * FROM users WHERE id = ?",
          params: [userId],
          error: err.message,
        });
        return res.status(500).json({ error: "Datenbankfehler" });
      }

      let updatedPaidArticles = paidArticlesFromBody;

      if (userRow) {
        const dbPaidArticles = userRow.paid_articles
          ? JSON.parse(userRow.paid_articles)
          : [];
        const combinedArticles = [...dbPaidArticles];
        const dbIds = new Set(dbPaidArticles.map((article) => article.id));

        paidArticlesFromBody.forEach((newArticle) => {
          if (!dbIds.has(newArticle.id)) {
            combinedArticles.push(newArticle);
            dbIds.add(newArticle.id);
          }
        });

        updatedPaidArticles = combinedArticles;

        db.run(
          "UPDATE users SET paid_articles = ? WHERE id = ?",
          [JSON.stringify(combinedArticles), userId],
          (err) => {
            if (err) {
              console.error("[DB ERROR] Update failed:", {
                query: "UPDATE users SET paid_articles = ? WHERE id = ?",
                params: [JSON.stringify(combinedArticles), userId],
                error: err.message,
              });
              return res.status(500).json({ error: "Datenbankfehler" });
            }
            console.log(`paid_articles für User ${userId} aktualisiert.`);
          }
        );
      } else {
        db.run(
          "INSERT INTO users (id, paid_articles) VALUES (?, ?)",
          [userId, JSON.stringify(paidArticlesFromBody)],
          (err) => {
            if (err) {
              console.error("[DB ERROR] Insert failed:", {
                query: "INSERT INTO users (id, paid_articles) VALUES (?, ?)",
                params: [userId, JSON.stringify(paidArticlesFromBody)],
                error: err.message,
              });
              return res.status(500).json({ error: "Datenbankfehler" });
            }
            console.log(`Neuer User ${userId} mit paid_articles angelegt.`);
          }
        );
      }

      res.json({ paidArticles: updatedPaidArticles });
    });
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    res.status(401).json({ error: "Invalid token" });
  }
});

// Neuer Logout-Endpunkt
router.post("/logout", (req, res) => {
  const token = req.cookies.authToken;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    jwt.verify(token, JWT_SECRET); // Verifiziere das Token
    res.clearCookie("authToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.json({ success: true });
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    res.status(401).json({ error: "Invalid token" });
  }
});

// Status-Check-Endpunkt
router.get("/auth/status", (req, res) => {
  const token = req.cookies.authToken;
  if (!token) {
    return res.json({ isAuthenticated: false });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    res.json({ isAuthenticated: true });
  } catch (err) {
    res.json({ isAuthenticated: false });
  }
});

// Neue Schnittstelle: GET /user-info
router.get("/user-info", (req, res) => {
  const token = req.cookies.authToken;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.sub;

    db.get(
      "SELECT premium_start, premium_end FROM users WHERE id = ?",
      [userId],
      (err, row) => {
        if (err) {
          console.error("[DB ERROR] Query failed:", {
            query: "SELECT premium_start, premium_end FROM users WHERE id = ?",
            params: [userId],
            error: err.message,
          });
          return res.status(500).json({ error: "Datenbankfehler" });
        }

        if (!row) {
          return res.status(404).json({ error: "User not found" });
        }

        const currentDate = new Date();
        const premiumEnd = row.premium_end ? new Date(row.premium_end) : null;
        const status =
          premiumEnd && premiumEnd > currentDate ? "premium" : "free";

        res.json({
          walletId: userId,
          status,
          premiumStart: row.premium_start
            ? new Date(row.premium_start).toISOString()
            : null,
          premiumEnd: premiumEnd ? premiumEnd.toISOString() : null,
        });
      }
    );
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    res.status(401).json({ error: "Invalid token" });
  }
});

// Neue Schnittstelle: POST /delete-account
router.post("/delete-account", (req, res) => {
  const token = req.cookies.authToken;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.sub;

    db.run("DELETE FROM users WHERE id = ?", [userId], (err) => {
      if (err) {
        console.error("[DB ERROR] Delete failed:", {
          query: "DELETE FROM users WHERE id = ?",
          params: [userId],
          error: err.message,
        });
        return res.status(500).json({ error: "Datenbankfehler" });
      }

      db.run("DELETE FROM auth_requests WHERE user_id = ?", [userId], (err) => {
        if (err) {
          console.error("[DB ERROR] Delete auth_requests failed:", err.message);
        }
      });

      res.clearCookie("authToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
      res.json({ success: true });
    });
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    res.clearCookie("authToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.status(401).json({ error: "Invalid token" });
  }
});

process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error("Fehler beim Schließen der Datenbank:", err.message);
    } else {
      console.log("Datenbankverbindung geschlossen.");
    }
    process.exit(0);
  });
});

module.exports = router;
