# Dokumentasi API ROALSHOES (Rancangan)

> **PERHATIAN:** Dokumen ini adalah **rancangan integrasi backend**. Website
> Roalshoes saat ini memakai HTML, CSS, JavaScript, dan LocalStorage tanpa
> backend, sehingga **endpoint di bawah belum berjalan**. Struktur data
> mengikuti `database/database.sql`.

## 1. Deskripsi Umum

| Item | Keterangan |
|---|---|
| Gaya API | REST, format JSON |
| Base URL (rencana) | `http://localhost:3000/api` |
| Autentikasi | JWT melalui header `Authorization: Bearer <token>` |
| Peran | `pelanggan` dan `admin` |
| Header umum | `Content-Type: application/json` |

## 2. Daftar Endpoint

| Method | Endpoint | Fungsi | Akses |
|---|---|---|---|
| POST | `/auth/register` | Registrasi pelanggan | Publik |
| POST | `/auth/login` | Login, mengembalikan token | Publik |
| GET | `/auth/me` | Data pengguna yang login | Login |
| GET | `/services` | Daftar layanan aktif | Publik |
| GET | `/services/:id` | Detail layanan | Publik |
| POST | `/services` | Tambah layanan | Admin |
| PUT | `/services/:id` | Ubah layanan (termasuk harga) | Admin |
| DELETE | `/services/:id` | Hapus layanan (atau nonaktifkan bila sudah dipesan) | Admin |
| GET | `/orders` | Daftar pesanan (admin: semua, pelanggan: miliknya) | Login |
| GET | `/orders/:id` | Detail pesanan | Login (pemilik/admin) |
| POST | `/orders` | Buat pesanan | Pelanggan |
| PUT | `/orders/:id` | Ubah data pesanan (mis. catatan) | Admin |
| PATCH | `/orders/:id/status` | Ubah status pesanan | Admin |
| GET | `/payments` | Daftar pembayaran (admin: semua, pelanggan: miliknya) | Login |
| POST | `/payments` | Catat pembayaran | Pelanggan |
| PATCH | `/payments/:id/status` | Verifikasi pembayaran | Admin |

## 3. Autentikasi

### POST `/auth/register`
Request body:
```json
{
  "nama": "Budi Santoso",
  "email": "budi@mail.com",
  "no_hp": "081234567890",
  "password": "rahasia123"
}
```
Response `201 Created`:
```json
{
  "message": "Registrasi berhasil",
  "data": { "id_user": 3, "nama": "Budi Santoso", "email": "budi@mail.com", "role": "pelanggan" }
}
```
Error: `400` (validasi gagal), `409` (email sudah terdaftar).

### POST `/auth/login`
Request body:
```json
{ "identitas": "pelanggan", "password": "user123" }
```
Response `200 OK`:
```json
{
  "message": "Login berhasil",
  "token": "<jwt>",
  "user": { "id_user": 2, "nama": "Sinta Pelanggan", "role": "pelanggan" }
}
```
Error: `400` (data kosong), `401` (username/email atau password salah).

### GET `/auth/me`
Header: `Authorization: Bearer <token>`

Response `200 OK`:
```json
{
  "data": {
    "id_user": 2, "nama": "Sinta Pelanggan", "username": "pelanggan",
    "email": "pelanggan@roalshoes.id", "no_hp": "081200000002",
    "alamat": "Bekasi, Jawa Barat", "role": "pelanggan"
  }
}
```
Error: `401` (token tidak ada atau tidak valid).

## 4. Services

### GET `/services`
Response `200 OK`:
```json
{
  "data": [
    { "id_service": 1, "nama_layanan": "Fast Cleaning",
      "deskripsi": "Pembersihan ringan untuk bagian luar sepatu.",
      "harga": 25000, "estimasi_hari": 1, "is_active": 1 }
  ]
}
```

### GET `/services/:id`
Response `200 OK` berisi satu objek layanan. Error `404` bila tidak ditemukan.

### POST `/services` (Admin)
Request body:
```json
{
  "nama_layanan": "Suede Treatment",
  "deskripsi": "Perawatan khusus sepatu bahan suede.",
  "harga": 70000,
  "estimasi_hari": 4,
  "is_active": 1
}
```
Response `201 Created`: objek layanan baru beserta `id_service`.
Error: `400` (harga kurang dari 1000 atau data tidak lengkap), `401`, `403`.

### PUT `/services/:id` (Admin)
Body sama seperti POST. Response `200 OK`. Error: `400`, `401`, `403`, `404`.

### DELETE `/services/:id` (Admin)
Response `200 OK`:
```json
{ "message": "Layanan sudah pernah dipesan, jadi dinonaktifkan" }
```
atau `{ "message": "Layanan dihapus" }`.

## 5. Orders

### POST `/orders` (Pelanggan)
Request body:
```json
{
  "catatan": "Tolong hati-hati di bagian sol.",
  "items": [
    { "id_service": 2, "merek_sepatu": "Nike Air Force 1", "jumlah": 2 }
  ]
}
```
Server mengambil `harga_satuan` dari tabel `services`, menghitung `subtotal` dan `total_harga`, membuat `kode_order`, dan menyetel status awal `Pending`.

Response `201 Created`:
```json
{
  "message": "Pesanan berhasil dibuat",
  "data": {
    "id_order": 2, "kode_order": "RS-20261101-001", "tanggal_order": "2026-11-01",
    "total_harga": 100000, "status_order": "Pending",
    "details": [
      { "id_detail": 2, "id_service": 2, "nama_layanan": "Deep Cleaning",
        "merek_sepatu": "Nike Air Force 1", "jumlah": 2,
        "harga_satuan": 50000, "subtotal": 100000 }
    ]
  }
}
```
Error: `400` (item kosong, jumlah di luar 1 sampai 20, layanan nonaktif), `401`, `403`.

### GET `/orders` dan GET `/orders/:id`
Response `200 OK`:
```json
{
  "data": [
    { "id_order": 1, "id_user": 2, "kode_order": "RS-20261020-001",
      "tanggal_order": "2026-10-20", "total_harga": 100000,
      "status_order": "Sedang Dikerjakan", "catatan": "Tolong hati-hati di bagian sol.",
      "details": [ { "id_detail": 1, "nama_layanan": "Deep Cleaning", "merek_sepatu": "Nike Air Force 1", "jumlah": 2, "harga_satuan": 50000, "subtotal": 100000 } ],
      "payments": [ { "id_payment": 1, "metode": "QRIS", "jumlah_bayar": 100000, "status_bayar": "Lunas" } ] }
  ]
}
```
Pelanggan hanya menerima pesanan miliknya. Mengakses pesanan orang lain menghasilkan `403`. `404` bila tidak ada.

### PUT `/orders/:id` (Admin)
```json
{ "catatan": "Pelanggan minta tali diganti." }
```
Response `200 OK`.

### PATCH `/orders/:id/status` (Admin)
```json
{ "status_order": "Quality Control" }
```
Response `200 OK`:
```json
{ "message": "Status pesanan diperbarui", "data": { "id_order": 1, "status_order": "Quality Control" } }
```
Aturan: status hanya maju sesuai alur; `Dibatalkan` hanya dari `Pending` atau `Dikonfirmasi`; `Diambil/Dikirim` hanya jika ada pembayaran `Lunas`.
Error: `400` (status tidak valid atau melanggar aturan alur), `401`, `403`, `404`.

Alur status:
`Pending → Dikonfirmasi → Menunggu Sepatu → Sedang Dikerjakan → Quality Control → Selesai → Diambil/Dikirim` (cabang: `Dibatalkan`).

## 6. Payments

### POST `/payments` (Pelanggan)
```json
{ "id_order": 2, "metode": "QRIS", "referensi": "QRIS-0002" }
```
`jumlah_bayar` diambil otomatis dari `total_harga` pesanan. Metode: `Transfer Bank`, `QRIS`, `Tunai`. Referensi wajib kecuali metode `Tunai`.

Response `201 Created`:
```json
{
  "message": "Pembayaran dicatat, menunggu verifikasi",
  "data": { "id_payment": 2, "id_order": 2, "metode": "QRIS", "jumlah_bayar": 100000,
            "referensi": "QRIS-0002", "status_bayar": "Menunggu Verifikasi", "tanggal_bayar": "2026-11-01" }
}
```
Error: `400` (referensi kosong, pesanan sudah dibatalkan, atau sudah ada pembayaran Menunggu Verifikasi/Lunas), `401`, `403`, `404`.

### GET `/payments`
Response `200 OK` berisi daftar pembayaran (filter otomatis sesuai peran).

### PATCH `/payments/:id/status` (Admin)
```json
{ "status_bayar": "Lunas" }
```
Nilai: `Lunas` atau `Ditolak`, hanya dari status `Menunggu Verifikasi`.
Response `200 OK`. Error: `400`, `401`, `403`, `404`.

## 7. Kode Status HTTP

| Kode | Arti |
|---|---|
| 200 | Berhasil |
| 201 | Data berhasil dibuat |
| 400 | Permintaan tidak valid (validasi atau aturan bisnis gagal) |
| 401 | Belum login atau token tidak valid |
| 403 | Tidak punya hak akses |
| 404 | Data tidak ditemukan |
| 409 | Konflik data (mis. email sudah terdaftar) |
| 500 | Kesalahan server |

## 8. Format Error

```json
{ "error": true, "message": "Pembayaran harus Lunas sebelum status Diambil/Dikirim" }
```

## 9. Otorisasi per Peran

| Aksi | Publik | Pelanggan | Admin |
|---|---|---|---|
| Lihat layanan | Ya | Ya | Ya |
| Kelola layanan | Tidak | Tidak | Ya |
| Buat pesanan dan pembayaran | Tidak | Ya | Tidak |
| Lihat pesanan/pembayaran | Tidak | Milik sendiri | Semua |
| Ubah status pesanan dan pembayaran | Tidak | Tidak | Ya |

## 10. Pemetaan ke Website Saat Ini (LocalStorage)

| Fungsi website | Endpoint rancangan |
|---|---|
| Registrasi (`auth.js`) | `POST /auth/register` |
| Login (`auth.js`) | `POST /auth/login` |
| Daftar layanan (`index.html`, admin layanan) | `GET/POST/PUT/DELETE /services` |
| Buat pesanan (`order.js`) | `POST /orders` |
| Bayar (`order.js`) | `POST /payments` |
| Ubah status, verifikasi bayar (`admin.js`) | `PATCH /orders/:id/status`, `PATCH /payments/:id/status` |

## 11. Batasan

Dokumen ini belum diimplementasikan dan belum diuji. Saat backend dibuat, password harus di-hash, token JWT harus punya masa berlaku, dan validasi harus dilakukan di server (tidak cukup di browser).