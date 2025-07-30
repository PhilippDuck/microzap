const crypto = require("crypto");

// Eingabewert (Hex-String)
const inputHex =
  "f9f685b90020bfdddef6a2a1cdb34cda9f09a0b8b77b93633a89b1f37ab3e9f2";

// Hex-String in Bytes umwandeln
const inputBytes = Buffer.from(inputHex, "hex");

// SHA-256 Hash berechnen
const hash = crypto.createHash("sha256").update(inputBytes).digest("hex");

// Ergebnis ausgeben
console.log(hash);
// Ausgabe: b2de2297aea66aa62d8c1d218ac589274729965de509a04c49aa175c7832e956
