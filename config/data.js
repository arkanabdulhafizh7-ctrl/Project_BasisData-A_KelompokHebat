/* ==========================================================
   ROALSHOES - config/data.js
   Sumber data tunggal (LocalStorage) + data awal (seed).
   Struktur dibuat mirip tabel di database/database.sql
   ========================================================== */

const RS_KEYS = {
  users: "rs_users",
  services: "rs_services",
  orders: "rs_orders",
  session: "rs_session" // disimpan di sessionStorage
};

const STATUS_PESANAN = [
  "Pending", "Dikonfirmasi", "Menunggu Sepatu", "Sedang Dikerjakan",
  "Quality Control", "Selesai", "Diambil/Dikirim", "Dibatalkan"
];
const STATUS_BAYAR = ["Menunggu Verifikasi", "Lunas", "Ditolak"];
const METODE_BAYAR = ["Transfer Bank", "QRIS", "Tunai"];

/* ---------- Data awal ---------- */
const SEED_USERS = [
  { id_user: 1, nama: "Admin Roalshoes", username: "admin", email: "admin@roalshoes.id",
    password: "admin123", no_hp: "081200000001", alamat: "Gerai Roalshoes", role: "admin" },
  { id_user: 2, nama: "Sinta Pelanggan", username: "pelanggan", email: "pelanggan@roalshoes.id",
    password: "user123", no_hp: "081200000002", alamat: "Bekasi, Jawa Barat", role: "pelanggan" }
];

const SEED_SERVICES = [
  { id_service: 1, nama_layanan: "Fast Cleaning", deskripsi: "Pembersihan ringan untuk bagian luar sepatu.", harga: 25000, estimasi_hari: 1, is_active: 1 },
  { id_service: 2, nama_layanan: "Deep Cleaning", deskripsi: "Pembersihan menyeluruh pada bagian luar, dalam, dan midsole sepatu.", harga: 50000, estimasi_hari: 3, is_active: 1 },
  { id_service: 3, nama_layanan: "Unyellowing", deskripsi: "Perawatan untuk membantu mengurangi warna kekuningan pada bagian tertentu sepatu.", harga: 60000, estimasi_hari: 4, is_active: 1 },
  { id_service: 4, nama_layanan: "Leather Treatment", deskripsi: "Pembersihan dan perawatan sepatu berbahan kulit.", harga: 65000, estimasi_hari: 4, is_active: 1 },
  { id_service: 5, nama_layanan: "Repaint / Recolor", deskripsi: "Pengecatan ulang atau perubahan warna pada bagian sepatu.", harga: 100000, estimasi_hari: 7, is_active: 1 }
];

const SEED_ORDERS = [
  {
    id_order: 1, id_user: 2, kode_order: "RS-20261020-001", tanggal_order: "2026-10-20",
    total_harga: 100000, status_order: "Sedang Dikerjakan", catatan: "Tolong hati-hati di bagian sol.",
    details: [
      { id_detail: 1, id_service: 2, nama_layanan: "Deep Cleaning", merek_sepatu: "Nike Air Force 1",
        jumlah: 2, harga_satuan: 50000, subtotal: 100000 }
    ],
    payments: [
      { id_payment: 1, metode: "QRIS", jumlah_bayar: 100000, referensi: "QRIS-0001",
        status_bayar: "Lunas", tanggal_bayar: "2026-10-20" }
    ]
  }
];

/* ---------- Akses LocalStorage ---------- */
const DB = {
  get(table) {
    try { return JSON.parse(localStorage.getItem(RS_KEYS[table])) || []; }
    catch (e) { return []; }
  },
  set(table, data) { localStorage.setItem(RS_KEYS[table], JSON.stringify(data)); },
  nextId(list, field) { return list.length ? Math.max(...list.map(i => i[field])) + 1 : 1; },
  init() {
    if (!localStorage.getItem(RS_KEYS.users)) DB.set("users", SEED_USERS);
    if (!localStorage.getItem(RS_KEYS.services)) DB.set("services", SEED_SERVICES);
    if (!localStorage.getItem(RS_KEYS.orders)) DB.set("orders", SEED_ORDERS);
  },
  reset() {
    Object.values(RS_KEYS).forEach(k => localStorage.removeItem(k));
    sessionStorage.removeItem(RS_KEYS.session);
    DB.init();
  }
};

DB.init();