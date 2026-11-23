# Backend ROALSHOES

REST API Node.js + Express untuk MySQL/MariaDB. Endpoint mengikuti [dokumentasi API](../docs/API-Documentation.md) dan berjalan pada prefix `/api`.

## Persiapan

1. Pasang Node.js 18.11 atau lebih baru dan MySQL/MariaDB.
2. Buat database `roalshoes_db` dan tabel sesuai [database/database.sql](../database/database.sql). **Perhatian:** skrip SQL tersebut memuat `DROP DATABASE IF EXISTS roalshoes_db`; menjalankannya akan menghapus database lama beserta datanya.
3. Dari folder `backend`, salin `.env.example` menjadi `.env`, lalu isi kredensial MySQL dan ganti `JWT_SECRET` dengan nilai acak minimal 32 karakter.
4. Jalankan `npm install`, lalu `npm start`.

API tersedia di `http://localhost:3000/api`; cek server melalui `GET /api/health`. Gunakan `npm run dev` untuk mode pengembangan dengan restart otomatis.

## Akun demo

Database contoh menyediakan `admin` / `admin123` dan `pelanggan` / `user123`. Kata sandi contoh lama masih berupa teks biasa; pada login pertama yang berhasil, backend memverifikasi lalu menggantinya dengan hash bcrypt. Akun yang dibuat melalui endpoint registrasi langsung menyimpan hash.

## Catatan integrasi

- Atur `CORS_ORIGINS` di `.env` ke origin frontend, dipisahkan koma. Default mengizinkan Live Server di `localhost:5500` dan `127.0.0.1:5500`.
- Klien frontend `assets/js/api.js` menggunakan base URL `http://localhost:3000/api` secara default.
- Endpoint yang memerlukan login mengharuskan `Authorization: Bearer <token>`. Endpoint tulis admin memeriksa peran dari database.
- Server memvalidasi payload, menerapkan aturan status, dan memakai query parameter untuk akses database.
