const express = require("express");
const { pool, withTransaction } = require("../db");
const { HttpError, parseId, validateService } = require("../utils");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  const [services] = await pool.execute(
    "SELECT id_service, nama_layanan, deskripsi, harga, estimasi_hari, is_active FROM services WHERE is_active = 1 ORDER BY id_service"
  );
  res.json({ data: services });
});

router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id, "ID layanan");
  const [services] = await pool.execute(
    "SELECT id_service, nama_layanan, deskripsi, harga, estimasi_hari, is_active FROM services WHERE id_service = ? AND is_active = 1",
    [id]
  );
  if (!services.length) throw new HttpError(404, "Layanan tidak ditemukan.");
  res.json({ data: services[0] });
});

router.post("/", authenticate, authorize("admin"), async (req, res) => {
  const service = validateService(req.body);
  const [result] = await pool.execute(
    "INSERT INTO services (nama_layanan, deskripsi, harga, estimasi_hari, is_active) VALUES (?, ?, ?, ?, ?)",
    [service.nama_layanan, service.deskripsi, service.harga, service.estimasi_hari, service.is_active]
  );
  res.status(201).json({
    message: "Layanan berhasil ditambahkan",
    data: { id_service: result.insertId, ...service }
  });
});

router.put("/:id", authenticate, authorize("admin"), async (req, res) => {
  const id = parseId(req.params.id, "ID layanan");
  const service = validateService(req.body);
  await withTransaction(async connection => {
    const [existing] = await connection.execute(
      "SELECT id_service FROM services WHERE id_service = ? FOR UPDATE",
      [id]
    );
    if (!existing.length) throw new HttpError(404, "Layanan tidak ditemukan.");
    await connection.execute(
      "UPDATE services SET nama_layanan = ?, deskripsi = ?, harga = ?, estimasi_hari = ?, is_active = ? WHERE id_service = ?",
      [service.nama_layanan, service.deskripsi, service.harga, service.estimasi_hari, service.is_active, id]
    );
  });
  res.json({ message: "Layanan berhasil diperbarui", data: { id_service: id, ...service } });
});

router.delete("/:id", authenticate, authorize("admin"), async (req, res) => {
  const id = parseId(req.params.id, "ID layanan");
  const message = await withTransaction(async connection => {
    const [services] = await connection.execute(
      "SELECT id_service FROM services WHERE id_service = ? FOR UPDATE",
      [id]
    );
    if (!services.length) throw new HttpError(404, "Layanan tidak ditemukan.");

    const [orders] = await connection.execute(
      "SELECT id_detail FROM order_details WHERE id_service = ? LIMIT 1",
      [id]
    );
    if (orders.length) {
      await connection.execute("UPDATE services SET is_active = 0 WHERE id_service = ?", [id]);
      return "Layanan sudah pernah dipesan, jadi dinonaktifkan";
    }

    await connection.execute("DELETE FROM services WHERE id_service = ?", [id]);
    return "Layanan dihapus";
  });
  res.json({ message: message });
});

module.exports = router;
