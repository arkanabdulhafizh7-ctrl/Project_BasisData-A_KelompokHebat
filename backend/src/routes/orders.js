const crypto = require("crypto");
const express = require("express");
const { pool, withTransaction } = require("../db");
const {
  HttpError,
  optionalText,
  parseId,
  positiveInteger,
  requiredText
} = require("../utils");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
const ORDER_STATUSES = [
  "Pending",
  "Dikonfirmasi",
  "Menunggu Sepatu",
  "Sedang Dikerjakan",
  "Quality Control",
  "Selesai",
  "Diambil/Dikirim",
  "Dibatalkan"
];

async function addOrderRelations(orderRows) {
  if (!orderRows.length) return [];
  const ids = orderRows.map(order => order.id_order);
  const placeholders = ids.map(() => "?").join(", ");
  const [details] = await pool.execute(
    "SELECT d.id_detail, d.id_order, d.id_service, s.nama_layanan, d.merek_sepatu, d.jumlah, d.harga_satuan, d.subtotal " +
    "FROM order_details d JOIN services s ON s.id_service = d.id_service " +
    "WHERE d.id_order IN (" + placeholders + ") ORDER BY d.id_detail",
    ids
  );
  const [payments] = await pool.execute(
    "SELECT id_payment, id_order, metode, jumlah_bayar, referensi, status_bayar, tanggal_bayar " +
    "FROM payments WHERE id_order IN (" + placeholders + ") ORDER BY id_payment",
    ids
  );
  const detailsByOrder = new Map();
  const paymentsByOrder = new Map();
  details.forEach(detail => {
    if (!detailsByOrder.has(detail.id_order)) detailsByOrder.set(detail.id_order, []);
    detailsByOrder.get(detail.id_order).push(detail);
  });
  payments.forEach(payment => {
    if (!paymentsByOrder.has(payment.id_order)) paymentsByOrder.set(payment.id_order, []);
    paymentsByOrder.get(payment.id_order).push(payment);
  });
  return orderRows.map(order => ({
    ...order,
    details: detailsByOrder.get(order.id_order) || [],
    payments: paymentsByOrder.get(order.id_order) || []
  }));
}

async function findOrder(id) {
  const sql = "SELECT id_order, id_user, kode_order, tanggal_order, total_harga, status_order, catatan " +
    "FROM orders WHERE id_order = ?";
  const [orders] = await pool.execute(sql, [id]);
  return orders[0] || null;
}

router.use(authenticate);

router.get("/", async (req, res) => {
  const [orders] = req.user.role === "admin"
    ? await pool.execute(
      "SELECT id_order, id_user, kode_order, tanggal_order, total_harga, status_order, catatan FROM orders ORDER BY id_order DESC"
    )
    : await pool.execute(
      "SELECT id_order, id_user, kode_order, tanggal_order, total_harga, status_order, catatan FROM orders WHERE id_user = ? ORDER BY id_order DESC",
      [req.user.id_user]
    );
  res.json({ data: await addOrderRelations(orders) });
});

router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id, "ID pesanan");
  const order = await findOrder(id);
  if (!order) throw new HttpError(404, "Pesanan tidak ditemukan.");
  if (req.user.role !== "admin" && order.id_user !== req.user.id_user) {
    throw new HttpError(403, "Anda tidak memiliki akses ke pesanan ini.");
  }
  res.json({ data: (await addOrderRelations([order]))[0] });
});

router.post("/", authorize("pelanggan"), async (req, res) => {
  const body = req.body;
  if (!body || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) {
    throw new HttpError(400, "Pesanan harus memiliki 1 sampai 20 item.");
  }
  const catatan = optionalText(body.catatan, "Catatan", 2000);
  const items = body.items.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new HttpError(400, "Data item pesanan tidak valid.");
    }
    return {
      id_service: positiveInteger(item.id_service, "ID layanan", 1, 2147483647),
      merek_sepatu: requiredText(item.merek_sepatu, "Merek sepatu", 1, 100),
      jumlah: positiveInteger(item.jumlah, "Jumlah", 1, 20)
    };
  });

  const order = await withTransaction(async connection => {
    const serviceIds = [...new Set(items.map(item => item.id_service))];
    const placeholders = serviceIds.map(() => "?").join(", ");
    const [services] = await connection.execute(
      "SELECT id_service, nama_layanan, harga, is_active FROM services WHERE id_service IN (" +
      placeholders + ") FOR UPDATE",
      serviceIds
    );
    const servicesById = new Map(services.map(service => [service.id_service, service]));
    if (servicesById.size !== serviceIds.length || services.some(service => !service.is_active)) {
      throw new HttpError(400, "Satu atau lebih layanan tidak tersedia.");
    }

    const orderDetails = items.map(item => {
      const service = servicesById.get(item.id_service);
      const subtotal = service.harga * item.jumlah;
      if (!Number.isSafeInteger(subtotal)) throw new HttpError(400, "Total pesanan tidak valid.");
      return {
        ...item,
        nama_layanan: service.nama_layanan,
        harga_satuan: service.harga,
        subtotal
      };
    });
    const total = orderDetails.reduce((sum, item) => sum + item.subtotal, 0);
    if (!Number.isSafeInteger(total) || total > 2147483647) {
      throw new HttpError(400, "Total pesanan melebihi batas yang diperbolehkan.");
    }

    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const kodeOrder = "RS-" + datePart + "-" + crypto.randomBytes(4).toString("hex").toUpperCase();
    const [result] = await connection.execute(
      "INSERT INTO orders (id_user, kode_order, tanggal_order, total_harga, status_order, catatan) " +
      "VALUES (?, ?, CURRENT_DATE(), ?, 'Pending', ?)",
      [req.user.id_user, kodeOrder, total, catatan]
    );
    const idOrder = result.insertId;
    for (const item of orderDetails) {
      const [detailResult] = await connection.execute(
        "INSERT INTO order_details (id_order, id_service, merek_sepatu, jumlah, harga_satuan, subtotal) VALUES (?, ?, ?, ?, ?, ?)",
        [idOrder, item.id_service, item.merek_sepatu, item.jumlah, item.harga_satuan, item.subtotal]
      );
      item.id_detail = detailResult.insertId;
      item.id_order = idOrder;
    }

    const [createdOrders] = await connection.execute(
      "SELECT id_order, id_user, kode_order, tanggal_order, total_harga, status_order, catatan FROM orders WHERE id_order = ?",
      [idOrder]
    );
    return { ...createdOrders[0], details: orderDetails, payments: [] };
  });
  res.status(201).json({ message: "Pesanan berhasil dibuat", data: order });
});

router.put("/:id", authorize("admin"), async (req, res) => {
  const id = parseId(req.params.id, "ID pesanan");
  const catatan = optionalText(req.body && req.body.catatan, "Catatan", 2000);
  const [orders] = await pool.execute("SELECT id_order FROM orders WHERE id_order = ?", [id]);
  if (!orders.length) throw new HttpError(404, "Pesanan tidak ditemukan.");
  await pool.execute("UPDATE orders SET catatan = ? WHERE id_order = ?", [catatan, id]);
  res.json({ message: "Data pesanan diperbarui", data: { id_order: id, catatan: catatan } });
});

router.patch("/:id/status", authorize("admin"), async (req, res) => {
  const id = parseId(req.params.id, "ID pesanan");
  const statusBaru = req.body && req.body.status_order;
  if (!ORDER_STATUSES.includes(statusBaru)) throw new HttpError(400, "Status pesanan tidak valid.");

  const updated = await withTransaction(async connection => {
    const [orders] = await connection.execute(
      "SELECT id_order, status_order FROM orders WHERE id_order = ? FOR UPDATE",
      [id]
    );
    if (!orders.length) throw new HttpError(404, "Pesanan tidak ditemukan.");
    const order = orders[0];
    const currentIndex = ORDER_STATUSES.indexOf(order.status_order);
    const nextIndex = ORDER_STATUSES.indexOf(statusBaru);
    if (statusBaru !== order.status_order) {
      const canCancel = ["Pending", "Dikonfirmasi"].includes(order.status_order) && statusBaru === "Dibatalkan";
      if (!canCancel && (statusBaru === "Dibatalkan" || nextIndex <= currentIndex)) {
        throw new HttpError(400, "Status pesanan hanya boleh maju sesuai alur.");
      }
      if (statusBaru === "Diambil/Dikirim") {
        const [payments] = await connection.execute(
          "SELECT id_payment FROM payments WHERE id_order = ? AND status_bayar = 'Lunas' LIMIT 1",
          [id]
        );
        if (!payments.length) {
          throw new HttpError(400, "Pembayaran harus Lunas sebelum status Diambil/Dikirim.");
        }
      }
      await connection.execute("UPDATE orders SET status_order = ? WHERE id_order = ?", [statusBaru, id]);
    }
    return { id_order: id, status_order: statusBaru };
  });

  res.json({ message: "Status pesanan diperbarui", data: updated });
});

module.exports = router;
