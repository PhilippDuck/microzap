const express = require("express");
const QRCode = require("qrcode");
const lnurlServer = require("../lnurlServer");

const router = express.Router();

router.get("/lnurl-auth", async (req, res) => {
  const result = await lnurlServer.generateNewUrl("login");
  const qrCode = await QRCode.toDataURL(result.encoded);
  res.json({ qrCode, url: result.url });
  console.log(result);
});

module.exports = router;
