# PRD: Sistem Informasi ROALSHOES

**Versi:** 1.0 · **Jenis:** Proyek UAS Sistem Informasi
**Platform:** Website statis (HTML5, CSS3, JavaScript, LocalStorage)

## 1. Latar Belakang
Roalshoes adalah usaha jasa cuci dan perawatan sepatu dengan layanan Fast Cleaning, Deep Cleaning, Unyellowing, Leather Treatment, dan Repaint/Recolor. Usaha kecil seperti ini umumnya menerima pesanan lewat chat dan mencatat secara manual, sehingga rawan salah catat dan sulit dipantau. Diperlukan sistem informasi berbasis web untuk pemesanan, pencatatan pembayaran, dan pemantauan status pengerjaan.

## 2. Identifikasi Masalah
1. Informasi layanan dan harga tidak terpusat.
2. Pemesanan lewat chat mudah terlewat atau salah catat.
3. Pelanggan tidak dapat memantau progres sepatu tanpa bertanya ke admin.
4. Pencatatan pembayaran manual sulit dilacak.
5. Admin tidak memiliki satu tempat untuk mengelola layanan, pelanggan, dan pesanan.

## 3. Rumusan Masalah
1. Bagaimana pelanggan dapat melihat layanan, memesan, dan mencatat pembayaran secara daring?
2. Bagaimana pelanggan memantau status pengerjaan sepatunya?
3. Bagaimana admin mengelola layanan, pelanggan, pesanan, dan pembayaran dalam satu dashboard?

## 4. Tujuan
1. Membuat sistem informasi pemesanan jasa cuci sepatu berbasis web.
2. Mempermudah pelanggan melakukan pemesanan.
3. Mempermudah admin mengelola pesanan.
4. Membantu pelanggan mengetahui status pengerjaan.
5. Mengelola data pelanggan, layanan, pesanan, dan pembayaran secara terstruktur.
6. Menerapkan analisis sistem, UML, database, UI/UX, API, dan pemrograman.

## 5. Manfaat
| Pihak | Manfaat |
|---|---|
| Pelanggan | Harga jelas, pemesanan praktis, status transparan, riwayat tersimpan |
| Admin | Data terpusat, pesanan tertib, pembayaran terlacak |
| Mahasiswa | Pengalaman menerapkan analisis, desain, dan pemrograman web |

## 6. Deskripsi Sistem
ROALSHOES adalah website dengan dua sisi: **pelanggan** (beranda, pemesanan, status, riwayat, profil) dan **admin** (dashboard, layanan, pelanggan, pesanan). Data disimpan di **LocalStorage** browser sebagai simulasi, sedangkan `database/database.sql` adalah **rancangan** untuk backend di masa depan.

**Identitas visual:** hitam, putih, dan oranye; modern, minimalis, premium, responsif.

**Katalog awal (data simulasi, harga dapat diubah admin):**
| Layanan | Harga | Estimasi |
|---|---|---|
| Fast Cleaning | Rp25.000 | 1 hari |
| Deep Cleaning | Rp50.000 | 3 hari |
| Unyellowing | Rp60.000 | 4 hari |
| Leather Treatment | Rp65.000 | 4 hari |
| Repaint / Recolor | Rp100.000 | 7 hari |

## 7. Ruang Lingkup
**Termasuk:** registrasi, login dan logout dengan pembatasan role, katalog layanan, pemesanan, pencatatan pembayaran, status dan riwayat pesanan, profil, pembatalan pesanan oleh pelanggan, dashboard admin, CRUD layanan, data pelanggan, pengelolaan pesanan dan verifikasi pembayaran.

**Tidak termasuk:** backend dan koneksi MySQL, payment gateway, notifikasi otomatis, upload foto, laporan transaksi terpisah, dan deployment publik.

## 8. Target Pengguna
| Pengguna | Kebutuhan utama |
|---|---|
| Pelanggan (mahasiswa, pekerja, kolektor sneakers) | Melihat layanan, memesan, membayar, memantau status |
| Admin (pemilik atau staf) | Mengelola data usaha dan memperbarui progres |

## 9. Kebutuhan Fungsional
| Kode | Kebutuhan | Aktor |
|---|---|---|
| FR-01 | Registrasi akun pelanggan dengan validasi | Pelanggan |
| FR-02 | Login (tab Pelanggan/Admin) dan logout | Pelanggan, Admin |
| FR-03 | Menampilkan beranda dan layanan aktif beserta harga | Pelanggan |
| FR-04 | Membuat pesanan dengan total harga otomatis | Pelanggan |
| FR-05 | Mencatat pembayaran (Transfer Bank, QRIS, Tunai) | Pelanggan |
| FR-06 | Melihat status dan progres pesanan | Pelanggan |
| FR-07 | Membatalkan pesanan (status Pending atau Dikonfirmasi) | Pelanggan |
| FR-08 | Melihat riwayat pesanan | Pelanggan |
| FR-09 | Melihat dan mengubah profil | Pelanggan |
| FR-10 | Dashboard statistik dan pesanan terbaru | Admin |
| FR-11 | CRUD layanan termasuk pengaturan harga | Admin |
| FR-12 | Melihat, mencari, melihat detail, dan menghapus pelanggan | Admin |
| FR-13 | Melihat, mencari, memfilter, dan melihat detail pesanan | Admin |
| FR-14 | Mengubah status pengerjaan pesanan | Admin |
| FR-15 | Memverifikasi pembayaran (Lunas atau Ditolak) | Admin |
| FR-16 | Mengubah catatan dan menghapus pesanan | Admin |
| FR-17 | Pembatasan akses halaman berdasarkan role | Sistem |

## 10. Kebutuhan Nonfungsional
| Kode | Kategori | Kebutuhan |
|---|---|---|
| NFR-01 | Kegunaan | Antarmuka sederhana dan navigasi jelas |
| NFR-02 | Responsif | Nyaman di desktop dan smartphone |
| NFR-03 | Keamanan (simulasi) | Pengecekan role dan sesi di sessionStorage, output di-escape untuk mencegah injeksi HTML. Password masih teks biasa (lihat Batasan) |
| NFR-04 | Persistensi | Data tetap ada setelah halaman di-refresh |
| NFR-05 | Pemeliharaan | Kode modular: satu file data, satu file fungsi bersama, satu file per kelompok halaman |
| NFR-06 | Konsistensi visual | Palet hitam, putih, oranye di semua halaman |
| NFR-07 | Portabilitas | Berjalan di browser modern melalui Live Server |

## 11. Fitur Pelanggan
| Fitur | Spesifikasi |
|---|---|
| Registrasi | Nama (min 3), email valid, no. HP 9-14 digit, password min 6, konfirmasi cocok. Email dipakai juga sebagai username |
| Login | Username atau email dan password, sesuai tab role |
| Pemesanan | Pilih layanan, merek sepatu, jumlah 1-20, catatan. Total otomatis. Status awal Pending |
| Pembayaran | Metode dan referensi (wajib kecuali Tunai). Status awal Menunggu Verifikasi |
| Status pesanan | Bilah progres, info pembayaran, tombol Bayar dan Batalkan |
| Riwayat | Tabel kode, tanggal, layanan, total, status pesanan, status bayar |
| Profil | Ubah nama, no. HP, alamat, dan password |

## 12. Fitur Admin
| Fitur | Spesifikasi |
|---|---|
| Dashboard | Total pelanggan, total pesanan, sedang dikerjakan, selesai, total transaksi (pembayaran Lunas), 5 pesanan terbaru |
| Layanan | Tambah, ubah (termasuk harga dan status aktif), hapus |
| Pelanggan | Pencarian, detail, hapus |
| Pesanan | Pencarian, filter status, detail, ubah status, verifikasi pembayaran, ubah catatan, hapus |

## 13. Alur Bisnis
1. Pelanggan melihat layanan, registrasi, lalu login.
2. Pelanggan membuat pesanan, status **Pending**.
3. Pelanggan mencatat pembayaran, status bayar **Menunggu Verifikasi**.
4. Admin memverifikasi pembayaran (**Lunas** atau **Ditolak**) dan memperbarui status pengerjaan.
5. Pelanggan memantau status sampai sepatu diambil atau dikirim.

`Pending → Dikonfirmasi → Menunggu Sepatu → Sedang Dikerjakan → Quality Control → Selesai → Diambil/Dikirim`
Cabang: `Dibatalkan` (dari Pending atau Dikonfirmasi).

## 14. Business Rules
| Kode | Aturan |
|---|---|
| BR-01 | Email dan username pengguna unik |
| BR-02 | Registrasi publik hanya membuat role pelanggan. Akun admin disiapkan sebagai data awal |
| BR-03 | Pelanggan hanya mengakses halaman pelanggan, admin hanya halaman admin |
| BR-04 | Jumlah sepatu 1 sampai 20 per pesanan |
| BR-05 | Harga satuan disimpan sebagai snapshot di item pesanan, sehingga perubahan harga tidak mengubah pesanan lama |
| BR-06 | Total pesanan = harga satuan x jumlah |
| BR-07 | Pelanggan hanya melihat pesanan miliknya |
| BR-08 | Hanya admin yang mengubah status pesanan, status pembayaran, dan data layanan |
| BR-09 | Admin hanya dapat memajukan status. Mundur tidak diizinkan |
| BR-10 | Pembatalan hanya dari Pending atau Dikonfirmasi |
| BR-11 | Status Diambil/Dikirim hanya jika ada pembayaran Lunas |
| BR-12 | Layanan yang pernah dipesan tidak dihapus, hanya dinonaktifkan |
| BR-13 | Pelanggan yang masih punya pesanan tidak dapat dihapus |
| BR-14 | Pembayaran baru tidak dapat dicatat jika sudah ada yang Menunggu Verifikasi atau Lunas, atau pesanan Dibatalkan |
| BR-15 | Total transaksi dihitung dari pembayaran berstatus Lunas |

## 15. Batasan Sistem
1. Data tersimpan di LocalStorage browser, jadi **hanya ada di perangkat dan browser yang sama**.
2. **Bukan autentikasi aman.** Password disimpan teks biasa dan pengecekan role hanya di sisi browser. Cukup untuk simulasi kuliah, tidak untuk produksi.
3. SQL dan dokumentasi API adalah rancangan dan belum terhubung ke website.
4. Pembayaran hanya pencatatan, tanpa payment gateway.
5. Tidak ada notifikasi otomatis dan upload foto.

## 16. Asumsi
1. Pengguna memakai browser modern dengan JavaScript aktif.
2. Sepatu diserahkan langsung ke gerai di luar sistem.
3. Verifikasi pembayaran dilakukan manual oleh admin.
4. Hanya ada satu cabang usaha.

## 17. Indikator Keberhasilan
1. Seluruh fitur FR-01 sampai FR-17 berfungsi sesuai pengujian.
2. Pelanggan dapat menyelesaikan alur dari registrasi sampai melihat status.
3. Pelanggan tidak dapat membuka halaman admin.
4. Data pesanan pelanggan muncul di dashboard admin dan perubahan status tampil di sisi pelanggan.
5. Dokumentasi sesuai dengan implementasi.

## 18. Kesimpulan
ROALSHOES membantu proses pemesanan jasa cuci sepatu dari katalog sampai pemantauan status, dan memberi admin satu dashboard untuk mengelola usaha. Versi ini adalah simulasi front-end yang siap dikembangkan ke backend dengan database MySQL berdasarkan rancangan SQL dan API yang tersedia.