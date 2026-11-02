# ROALSHOES

*Clean Your Kicks, Keep Your Style*

ROALSHOES adalah website jasa cuci dan perawatan sepatu yang membantu pelanggan melihat layanan, memesan, mencatat pembayaran, dan memantau progres pengerjaan sepatu. Admin mengelola layanan, pelanggan, dan pesanan lewat dashboard. Proyek ini berupa website dengan data simulasi (LocalStorage), tanpa backend.

## Fitur

- Menampilkan layanan Fast Cleaning, Deep Cleaning, Unyellowing, Leather Treatment, dan Repaint/Recolor beserta harganya.
- Registrasi dan login dengan pembedaan akses pelanggan dan admin.
- Pemesanan dengan total harga otomatis, pencatatan pembayaran, dan pembatalan pesanan.
- Pemantauan status pengerjaan, riwayat pesanan, dan pengaturan profil.
- Dashboard admin: statistik, kelola layanan (tambah, ubah, hapus), data pelanggan, kelola pesanan, ubah status, dan verifikasi pembayaran.

## Menjalankan Website

1. Buka folder `ROALSHOES` di Visual Studio Code.
2. Klik kanan `index.html`, lalu pilih **Open with Live Server**.
3. Masuk dengan akun demo:

| Peran | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Pelanggan | `pelanggan` | `user123` |

Untuk mengembalikan data ke kondisi awal, buka Console browser (F12) lalu jalankan `DB.reset()`.

> Data tersimpan di LocalStorage browser dan login hanya simulasi (bukan autentikasi aman). File `database/database.sql` dan dokumentasi API adalah rancangan untuk backend di masa depan dan belum terhubung ke website.

## Dokumentasi

- [Product Requirements Document (PRD)](docs/PRD.md)
- [ERD](docs/ERD.md)
- [Class Diagram](docs/Class-Diagram.md)
- [Sequence Diagram](docs/Sequence-Diagram.md)
- [Use Case Diagram](docs/Use-Case.md)
- [Dokumentasi API (rancangan)](docs/API-Documentation.md)
- [Database SQL](database/database.sql)

---

## Anggota Kelompok

<table>
  <thead>
    <tr>
      <th align="left" width="60">No.</th>
      <th align="left" width="320">Nama</th>
      <th align="left" width="160">NPM</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>Muhammad Alfarel Prihadi</td><td><code>4525210083</code></td></tr>
    <tr><td>2</td><td>Farid Zhahir Muttaqin</td><td><code>4525210105</code></td></tr>
    <tr><td>3</td><td>Muhammad Syamil</td><td><code>4525210130</code></td></tr>
    <tr><td>4</td><td>Arkan Abdul Hafizh</td><td><code>4525210137</code></td></tr>
    <tr><td>5</td><td>Aqsa Ibnu Rizik</td><td><code>4525210103</code></td></tr>
    <tr><td>6</td><td>Muhammad Faathir Madani</td><td><code>4525210100</code></td></tr>
    <tr><td>7</td><td>M. Akbar Raffael Ridho</td><td><code>4525210085</code></td></tr>
  </tbody>
</table>