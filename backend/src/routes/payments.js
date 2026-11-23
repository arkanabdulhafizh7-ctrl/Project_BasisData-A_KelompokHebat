const express = require("express");
const { pool, withTransaction } = require("../db");
const { HttpError, parseId, positiveInteger, requiredText } = require("../utils");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
const PAYMENT_METHODS = ["Transfer Bank", "QRIS", "Tunai"];
const PAYMENT_STATUSES = ["Lunas", "Ditolak"];

router.use(authenticate);

router.get("/", async (req, res) => {
  const [payments] = req.user.role === "admin"
    ? await pool.execute(
      "SELECT p.id_payment, p.id_order, p.metode, p.jumlah_bayar, p.referensi, p.status_bayar, p.tanggal_bayar " +
      "FROM payments p ORDER BY p.id_payment DESC"
    )
    : await pool.execute(
      "SELECT p.id_payment, p.id_order, p.metode, p.jumlah_bayar, p.referensi, p.status_bayar, p.tanggal_bayar " +
      "FROM payments p JOIN orders o ON o.id_order = p.id_order WHERE o.id_user = ? ORDER BY p.id_payment DESC",
      [req.user.id_user]
    );
  res.json({ data: payments });
});

router.post("/", authorize("pelanggan"), async (req, res) => {
  const idOrder = positiveInteger(req.body && req.body.id_order, "ID pesanan", 1, 2147483647);
  const metode = req.body && req.body.metode;
  if (!PAYMENT_METHODS.includes(metode)) throw new HttpError(400, "Metode pembayaran tidak valid.");
  let referensi = "-";
  if (metode !== "Tunai") referensi = requiredText(req.body && req.body.referensi, "Referensi", 1, 100);
  else if (req.body && req.body.referensi !== undefined) {
    referensi = requiredText(req.body.referensi, "Referensi", 1, 100);
  }

  const payment = await withTransaction(async connection => {
    const [orders] = await connection.execute(
      "SELECT id_order, id_user, total_harga, status_order FROM orders WHERE id_order = ? FOR UPDATE",
      [idOrder]
    );
    if (!orders.length) throw new HttpError(404, "Pesanan tidak ditemukan.");
    const order = orders[0];
    if (order.id_user !== req.user.id_user) {
      throw new HttpError(403, "Anda tidak memiliki akses ke pesanan ini.");
    }
    if (order.status_order === "Dibatalkan") {
      throw new HttpError(400, "Pesanan yang dibatalkan tidak dapat dibayar.");
    }

    const [existingPayments] = await connection.execute(
      "SELECT id_payment FROM payments WHERE id_order = ? AND status_bayar IN ('Menunggu Verifikasi', 'Lunas') LIMIT 1 FOR UPDATE",
      [idOrder]
    );
    if (existingPayments.length) {
      throw new HttpError(400, "Pesanan sudah memiliki pembayaran yang menunggu verifikasi atau sudah lunas.");
    }

    const [result] = await connection.execute(
      "INSERT INTO payments (id_order, metode, jumlah_bayar, referensi, status_bayar, tanggal_bayar) " +
      "VALUES (?, ?, ?, ?, 'Menunggu Verifikasi', CURRENT_DATE())",
      [idOrder, metode, order.total_harga, referensi]
    );
    const [rows] = await connection.execute(
      "SELECT id_payment, id_order, metode, jumlah_bayar, referensi, status_bayar, tanggal_bayar FROM payments WHERE id_payment = ?",
      [result.insertId]
    );
    return rows[0];
  });

  res.status(201).json({ message: "Pembayaran dicatat, menunggu verifikasi", data: payment });
});

router.patch("/:id/status", authorize("admin"), async (req, res) => {
  const id = parseId(req.params.id, "ID pembayaran");
  const statusBaru = req.body && req.body.status_bayar;
  if (!PAYMENT_STATUSES.includes(statusBaru)) throw new HttpError(400, "Status pembayaran tidak valid.");

  const updated = await withTransaction(async connection => {
    const [payments] = await connection.execute(
      "SELECT id_payment, status_bayar FROM payments WHERE id_payment = ? FOR UPDATE",
      [id]
    );
    if (!payments.length) throw new HttpError(404, "Pembayaran tidak ditemukan.");
    if (payments[0].status_bayar !== "Menunggu Verifikasi") {
      throw new HttpError(400, "Hanya pembayaran yang menunggu verifikasi yang dapat diubah.");
    }
    await connection.execute("UPDATE payments SET status_bayar = ? WHERE id_payment = ?", [statusBaru, id]);
    return { id_payment: id, status_bayar: statusBaru };
  });

  res.json({ message: "Status pembayaran diperbarui", data: updated });
});

module.exports = router;
