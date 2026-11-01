-- ==========================================================
-- ROALSHOES - database/database.sql
-- Rancangan database MySQL/MariaDB (impor via phpMyAdmin).
-- CATATAN: Website saat ini memakai LocalStorage dan BELUM
-- terhubung ke database ini. File ini untuk persiapan backend.
-- ==========================================================

DROP DATABASE IF EXISTS roalshoes_db;
CREATE DATABASE roalshoes_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;
USE roalshoes_db;

-- ----------------------------------------------------------
-- 1. TABEL users (pelanggan dan admin dibedakan oleh kolom role)
-- ----------------------------------------------------------
CREATE TABLE users (
  id_user    INT AUTO_INCREMENT PRIMARY KEY,
  nama       VARCHAR(100) NOT NULL,
  username   VARCHAR(50)  NOT NULL UNIQUE,
  email      VARCHAR(100) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  no_hp      VARCHAR(20),
  alamat     TEXT,
  role       ENUM('pelanggan','admin') NOT NULL DEFAULT 'pelanggan',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 2. TABEL services (katalog layanan)
-- ----------------------------------------------------------
CREATE TABLE services (
  id_service    INT AUTO_INCREMENT PRIMARY KEY,
  nama_layanan  VARCHAR(100) NOT NULL,
  deskripsi     TEXT NOT NULL,
  harga         INT NOT NULL CHECK (harga >= 1000),
  estimasi_hari INT NOT NULL DEFAULT 3 CHECK (estimasi_hari BETWEEN 1 AND 30),
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 3. TABEL orders (header pesanan)
-- ----------------------------------------------------------
CREATE TABLE orders (
  id_order      INT AUTO_INCREMENT PRIMARY KEY,
  id_user       INT NOT NULL,
  kode_order    VARCHAR(30) NOT NULL UNIQUE,
  tanggal_order DATE NOT NULL,
  total_harga   INT NOT NULL DEFAULT 0,
  status_order  ENUM('Pending','Dikonfirmasi','Menunggu Sepatu','Sedang Dikerjakan',
                     'Quality Control','Selesai','Diambil/Dikirim','Dibatalkan')
                NOT NULL DEFAULT 'Pending',
  catatan       TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (id_user)
    REFERENCES users(id_user) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 4. TABEL order_details (item pesanan)
--    harga_satuan = snapshot harga saat pesanan dibuat (BR-05)
-- ----------------------------------------------------------
CREATE TABLE order_details (
  id_detail    INT AUTO_INCREMENT PRIMARY KEY,
  id_order     INT NOT NULL,
  id_service   INT NOT NULL,
  merek_sepatu VARCHAR(100) NOT NULL,
  jumlah       INT NOT NULL CHECK (jumlah >= 1),
  harga_satuan INT NOT NULL,
  subtotal     INT NOT NULL,
  CONSTRAINT fk_detail_order FOREIGN KEY (id_order)
    REFERENCES orders(id_order) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_detail_service FOREIGN KEY (id_service)
    REFERENCES services(id_service) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 5. TABEL payments (pencatatan pembayaran)
-- ----------------------------------------------------------
CREATE TABLE payments (
  id_payment   INT AUTO_INCREMENT PRIMARY KEY,
  id_order     INT NOT NULL,
  metode       ENUM('Transfer Bank','QRIS','Tunai') NOT NULL,
  jumlah_bayar INT NOT NULL,
  referensi    VARCHAR(100) DEFAULT '-',
  status_bayar ENUM('Menunggu Verifikasi','Lunas','Ditolak')
               NOT NULL DEFAULT 'Menunggu Verifikasi',
  tanggal_bayar DATE NOT NULL,
  CONSTRAINT fk_payment_order FOREIGN KEY (id_order)
    REFERENCES orders(id_order) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================
-- DATA CONTOH (sama dengan config/data.js)
-- Password teks biasa HANYA untuk simulasi. Backend nyata
-- wajib menyimpan hash (mis. bcrypt).
-- ==========================================================
INSERT INTO users (nama, username, email, password, no_hp, alamat, role) VALUES
('Admin Roalshoes', 'admin',     'admin@roalshoes.id',     'admin123', '081200000001', 'Gerai Roalshoes',    'admin'),
('Sinta Pelanggan', 'pelanggan', 'pelanggan@roalshoes.id', 'user123',  '081200000002', 'Bekasi, Jawa Barat', 'pelanggan');

INSERT INTO services (nama_layanan, deskripsi, harga, estimasi_hari, is_active) VALUES
('Fast Cleaning',     'Pembersihan ringan untuk bagian luar sepatu.', 25000, 1, 1),
('Deep Cleaning',     'Pembersihan menyeluruh pada bagian luar, dalam, dan midsole sepatu.', 50000, 3, 1),
('Unyellowing',       'Perawatan untuk membantu mengurangi warna kekuningan pada bagian tertentu sepatu.', 60000, 4, 1),
('Leather Treatment', 'Pembersihan dan perawatan sepatu berbahan kulit.', 65000, 4, 1),
('Repaint / Recolor', 'Pengecatan ulang atau perubahan warna pada bagian sepatu.', 100000, 7, 1);

INSERT INTO orders (id_user, kode_order, tanggal_order, total_harga, status_order, catatan) VALUES
(2, 'RS-20261020-001', '2026-10-20', 100000, 'Sedang Dikerjakan', 'Tolong hati-hati di bagian sol.');

INSERT INTO order_details (id_order, id_service, merek_sepatu, jumlah, harga_satuan, subtotal) VALUES
(1, 2, 'Nike Air Force 1', 2, 50000, 100000);

INSERT INTO payments (id_order, metode, jumlah_bayar, referensi, status_bayar, tanggal_bayar) VALUES
(1, 'QRIS', 100000, 'QRIS-0001', 'Lunas', '2026-10-20');

-- ==========================================================
-- CONTOH QUERY
-- SELECT/JOIN boleh dijalankan langsung.
-- INSERT/UPDATE/DELETE diberi komentar agar data contoh aman.
-- Hapus tanda "-- " di depan baris untuk mencobanya satu per satu.
-- ==========================================================

-- ---------- SELECT ----------
SELECT * FROM services WHERE is_active = 1 ORDER BY harga;

SELECT id_user, nama, email, no_hp FROM users WHERE role = 'pelanggan';

-- ---------- JOIN: daftar pesanan lengkap ----------
SELECT o.kode_order, u.nama AS pelanggan, s.nama_layanan, d.merek_sepatu,
       d.jumlah, d.subtotal, o.status_order
FROM orders o
JOIN users u         ON u.id_user = o.id_user
JOIN order_details d ON d.id_order = o.id_order
JOIN services s      ON s.id_service = d.id_service
ORDER BY o.id_order DESC;

-- ---------- JOIN: pesanan beserta pembayaran ----------
SELECT o.kode_order, p.metode, p.jumlah_bayar, p.status_bayar
FROM orders o
LEFT JOIN payments p ON p.id_order = o.id_order;

-- ---------- Statistik dashboard ----------
SELECT
  (SELECT COUNT(*) FROM users WHERE role = 'pelanggan')                       AS total_pelanggan,
  (SELECT COUNT(*) FROM orders)                                               AS total_pesanan,
  (SELECT COUNT(*) FROM orders WHERE status_order = 'Sedang Dikerjakan')      AS sedang_dikerjakan,
  (SELECT COUNT(*) FROM orders WHERE status_order IN ('Selesai','Diambil/Dikirim')) AS selesai,
  (SELECT COALESCE(SUM(jumlah_bayar),0) FROM payments WHERE status_bayar = 'Lunas') AS total_transaksi;

-- ---------- Riwayat pesanan satu pelanggan ----------
SELECT o.kode_order, o.tanggal_order, o.total_harga, o.status_order
FROM orders o WHERE o.id_user = 2 ORDER BY o.id_order DESC;

-- ---------- INSERT: pelanggan baru ----------
-- INSERT INTO users (nama, username, email, password, no_hp, role)
-- VALUES ('Budi Santoso', 'budi@mail.com', 'budi@mail.com', 'rahasia123', '081234567890', 'pelanggan');

-- ---------- INSERT: pesanan baru + item + pembayaran ----------
-- INSERT INTO orders (id_user, kode_order, tanggal_order, total_harga, status_order, catatan)
-- VALUES (2, 'RS-20261101-001', '2026-11-01', 60000, 'Pending', 'Sepatu putih');
-- INSERT INTO order_details (id_order, id_service, merek_sepatu, jumlah, harga_satuan, subtotal)
-- VALUES (LAST_INSERT_ID(), 3, 'Adidas Stan Smith', 1, 60000, 60000);

-- ---------- UPDATE: ubah harga layanan ----------
-- UPDATE services SET harga = 55000 WHERE id_service = 2;

-- ---------- UPDATE: ubah status pesanan ----------
-- UPDATE orders SET status_order = 'Quality Control' WHERE id_order = 1;

-- ---------- UPDATE: verifikasi pembayaran ----------
-- UPDATE payments SET status_bayar = 'Lunas' WHERE id_payment = 1;

-- ---------- DELETE ----------
-- Layanan yang belum pernah dipesan boleh dihapus (id 5 belum dipakai):
-- DELETE FROM services WHERE id_service = 5;
-- Layanan yang sudah dipesan cukup dinonaktifkan (BR-12):
-- UPDATE services SET is_active = 0 WHERE id_service = 2;
-- Hapus pesanan (item dan pembayarannya ikut terhapus karena ON DELETE CASCADE):
-- DELETE FROM orders WHERE id_order = 1;