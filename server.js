const express = require("express");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 3000;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = process.env.SMTP_SECURE === "true";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const RESPONSES_FILE = path.join(DATA_DIR, "responses.json");

if (!ACCESS_TOKEN || ACCESS_TOKEN.length < 24) {
  console.error("Set ACCESS_TOKEN to a long random value (at least 24 characters).");
  process.exit(1);
}

function ensureDataFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(RESPONSES_FILE)) fs.writeFileSync(RESPONSES_FILE, "[]", { mode: 0o600 });
}
function readResponses() {
  ensureDataFile();
  try { return JSON.parse(fs.readFileSync(RESPONSES_FILE, "utf8")); }
  catch { return []; }
}
function writeResponses(items) {
  ensureDataFile();
  fs.writeFileSync(RESPONSES_FILE, JSON.stringify(items, null, 2), { mode: 0o600 });
}
function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function privateLink(req) {
  return safeEqual(req.params.token, ACCESS_TOKEN);
}
function emailConfigured() {
  return Boolean(NOTIFY_EMAIL && SMTP_HOST && SMTP_USER && SMTP_PASS);
}
function mailer() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/g/:token", (req, res) => {
  if (!privateLink(req)) return res.status(404).send("This garden link is not available.");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/status/:token", (req, res) => {
  if (!privateLink(req)) return res.status(404).json({ error: "Not found" });
  res.json({
    ok: true,
    birthday: "2026-12-17",
    timezone: "Asia/Kathmandu",
    emailConfigured: emailConfigured()
  });
});

app.post("/api/answer/:token", async (req, res) => {
  if (!privateLink(req)) return res.status(404).json({ error: "Not found" });

  const now = new Date();
  const nepalNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kathmandu" }));
  const unlock = new Date("2026-12-17T00:00:00+05:45");
  if (now < unlock) return res.status(403).json({ error: "The birthday surprise is not open yet." });

  const answer = req.body && req.body.answer;
  if (!["yes", "not-sure", "no"].includes(answer)) {
    return res.status(400).json({ error: "Please choose one of the available answers." });
  }

  const responses = readResponses();
  if (responses.some(r => r.tokenHash === crypto.createHash("sha256").update(ACCESS_TOKEN).digest("hex"))) {
    return res.status(409).json({ error: "An answer has already been submitted." });
  }

  const record = {
    tokenHash: crypto.createHash("sha256").update(ACCESS_TOKEN).digest("hex"),
    answer,
    receivedAt: new Date().toISOString(),
    receivedAtNepal: nepalNow.toISOString()
  };
  responses.push(record);
  writeResponses(responses);

  if (emailConfigured()) {
    try {
      await mailer().sendMail({
        from: SMTP_USER,
        to: NOTIFY_EMAIL,
        subject: "Riri's birthday garden — response received",
        text: `Riri submitted her response: ${answer.toUpperCase()}.\nReceived at: ${record.receivedAt}\nNepal local time: ${record.receivedAtNepal}\n\nThis is an automated notification from Riri's Midnight Surprise.`
      });
    } catch (err) {
      console.error("Email notification failed:", err.message);
      return res.status(202).json({
        ok: true,
        saved: true,
        emailSent: false,
        message: "Your answer was saved, but the email notification could not be sent."
      });
    }
    return res.json({ ok: true, saved: true, emailSent: true });
  }

  return res.status(202).json({
    ok: true,
    saved: true,
    emailSent: false,
    message: "Your answer was saved. Email notification is not configured yet."
  });
});

app.use((_req, res) => res.status(404).send("Not found. Open the private garden link you were given."));

app.listen(PORT, () => console.log(`Riri's Midnight Surprise listening on port ${PORT}`));
