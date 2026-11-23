require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { HttpError } = require("./utils");
const authRoutes = require("./routes/auth");
const serviceRoutes = require("./routes/services");
const orderRoutes = require("./routes/orders");
const paymentRoutes = require("./routes/payments");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET wajib diatur dan memiliki minimal 32 karakter.");
}

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS ||
  "http://localhost:5500,http://127.0.0.1:5500")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new HttpError(403, "Origin tidak diizinkan."));
  }
}));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "roalshoes-api" });
});
app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);

app.use((req, res, next) => {
  next(new HttpError(404, "Endpoint tidak ditemukan."));
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: true, message: "Format JSON tidak valid." });
  }
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : 500;
  if (status === 500) console.error(error);
  const message = status === 500 ? "Terjadi kesalahan pada server." : error.message;
  res.status(status).json({ error: true, message: message });
});

module.exports = app;
