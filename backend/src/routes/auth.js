const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../db");
const { HttpError, requiredText, publicUser } = require("../utils");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const emailPattern = /^\S+@\S+\.\S+$/;

router.post("/register", async (req, res) => {
  const nama = requiredText(req.body && req.body.nama, "Nama", 3, 100);
  const email = requiredText(req.body && req.body.email, "Email", 5, 100).toLowerCase();
  const noHp = requiredText(req.body && req.body.no_hp, "Nomor telepon", 9, 14);
  const password = req.body && req.body.password;
  if (typeof password !== "string" || password.length < 6 || Buffer.byteLength(password, "utf8") > 72) {
    throw new HttpError(400, "Password harus minimal 6 karakter dan maksimal 72 byte.");
  }

  if (!emailPattern.test(email)) throw new HttpError(400, "Format email tidak valid.");
  if (!/^\d{9,14}$/.test(noHp)) throw new HttpError(400, "Nomor telepon harus 9-14 digit angka.");

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const [result] = await pool.execute(
      "INSERT INTO users (nama, username, email, password, no_hp, alamat, role) VALUES (?, ?, ?, ?, ?, '', 'pelanggan')",
      [nama, email, email, passwordHash, noHp]
    );
    res.status(201).json({
      message: "Registrasi berhasil",
      data: { id_user: result.insertId, nama: nama, email: email, role: "pelanggan" }
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new HttpError(409, "Email sudah terdaftar.");
    }
    throw error;
  }
});

router.post("/login", async (req, res) => {
  const identitas = requiredText(req.body && req.body.identitas, "Username/email", 1, 100).toLowerCase();
  const password = req.body && req.body.password;
  if (typeof password !== "string" || password.length === 0 || Buffer.byteLength(password, "utf8") > 72) {
    throw new HttpError(400, "Password tidak valid.");
  }
  const [users] = await pool.execute(
    "SELECT id_user, nama, username, email, password, no_hp, alamat, role FROM users WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1",
    [identitas, identitas]
  );
  if (!users.length) throw new HttpError(401, "Username/email atau password salah.");

  const user = users[0];
  const isHash = /^\$2[aby]\$/.test(user.password);
  const passwordMatches = isHash
    ? await bcrypt.compare(password, user.password)
    : password === user.password;
  if (!passwordMatches) throw new HttpError(401, "Username/email atau password salah.");

  if (!isHash) {
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.execute("UPDATE users SET password = ? WHERE id_user = ?", [passwordHash, user.id_user]);
  }

  const token = jwt.sign(
    { sub: String(user.id_user) },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
  res.json({ message: "Login berhasil", token, user: publicUser(user) });
});

router.get("/me", authenticate, (req, res) => {
  res.json({ data: publicUser(req.user) });
});

module.exports = router;
