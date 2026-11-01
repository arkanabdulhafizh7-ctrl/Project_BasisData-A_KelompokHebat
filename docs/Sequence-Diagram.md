# Sequence Diagram ROALSHOES

Partisipan: **Halaman Web** (HTML dan JavaScript di browser), **LocalStorage** (penyimpan data simulasi, setara database), dan **sessionStorage** (sesi login). Karena tidak ada backend, validasi dan logika dijalankan oleh JavaScript.

## A. Registrasi dan Login

```mermaid
sequenceDiagram
    actor P as Pelanggan
    participant W as Halaman Web (auth.js)
    participant L as LocalStorage
    participant S as sessionStorage

    P->>W: Isi form registrasi dan klik Daftar
    W->>W: Validasi nama, email, no HP, password
    alt Data tidak valid
        W-->>P: Tampilkan pesan error
    else Data valid
        W->>L: Baca rs_users
        L-->>W: Daftar pengguna
        alt Email sudah terdaftar
            W-->>P: Pesan "Email sudah terdaftar"
        else Email baru
            W->>L: Simpan pengguna baru (role pelanggan)
            W-->>P: Pesan berhasil, arahkan ke login
        end
    end

    P->>W: Pilih tab role, isi username dan password, klik Masuk
    W->>L: Cari pengguna dengan username/email dan password
    L-->>W: Data pengguna atau kosong
    alt Tidak cocok
        W-->>P: Pesan "username atau password salah"
    else Cocok tetapi role tidak sesuai tab
        W-->>P: Pesan "bukan akun yang dipilih"
    else Cocok
        W->>S: Simpan sesi (id_user, nama, role)
        alt role admin
            W-->>P: Arahkan ke dashboard admin
        else role pelanggan
            W-->>P: Arahkan ke halaman pemesanan
        end
    end
```

Registrasi memvalidasi input dan memastikan email unik sebelum menyimpan. Login memeriksa kecocokan data dan role pada tab, lalu membuat sesi dan mengarahkan sesuai role.

## B. Pemesanan Jasa Cuci Sepatu

```mermaid
sequenceDiagram
    actor P as Pelanggan
    participant W as Halaman Web (order.js)
    participant L as LocalStorage

    P->>W: Buka halaman pemesanan
    W->>W: requireRole("pelanggan")
    W->>L: Baca rs_services dan data pengguna
    L-->>W: Layanan aktif dan profil
    W-->>P: Tampilkan form (nama dan no HP terisi)

    P->>W: Pilih layanan dan isi jumlah
    W->>W: Hitung total = harga x jumlah
    W-->>P: Tampilkan total otomatis

    P->>W: Isi merek sepatu dan klik Buat Pesanan
    W->>W: Validasi layanan, merek, jumlah 1-20, no HP
    alt Validasi gagal
        W-->>P: Tampilkan pesan error
    else Valid
        W->>L: Simpan pesanan (status Pending, item, harga satuan)
        W->>L: Perbarui no HP pengguna
        W-->>P: Toast berhasil, arahkan ke Status Pesanan
    end
```

Total dihitung langsung di browser. Pesanan disimpan dengan status awal `Pending` dan harga satuan sebagai snapshot.

## C. Proses Pembayaran dan Verifikasi

```mermaid
sequenceDiagram
    actor P as Pelanggan
    actor A as Admin
    participant W as Halaman Web (order.js / admin.js)
    participant L as LocalStorage

    P->>W: Klik Bayar pada pesanan
    W->>W: Cek bolehBayar (tidak dibatalkan, tidak ada bayar aktif)
    W-->>P: Tampilkan modal pembayaran
    P->>W: Pilih metode, isi referensi, klik Catat Pembayaran
    alt Metode bukan Tunai dan referensi kosong
        W-->>P: Pesan "isi nomor referensi"
    else Valid
        W->>L: Simpan pembayaran (jumlah = total, status Menunggu Verifikasi)
        W-->>P: Toast "menunggu verifikasi admin"
    end

    A->>W: Buka Detail Pesanan
    W->>L: Baca pesanan dan pembayaran
    L-->>W: Data pesanan
    W-->>A: Tampilkan tabel pembayaran
    A->>W: Klik Lunas atau Tolak
    W->>L: Ubah status_bayar
    W-->>A: Toast status pembayaran diperbarui
    Note over P,W: Pelanggan melihat status bayar terbaru di halaman Status dan Riwayat
```

Pembayaran hanya dapat dicatat bila tidak ada pembayaran yang menunggu verifikasi atau sudah lunas. Jika ditolak, pelanggan dapat mencatat ulang.

## D. Pembaruan Status Pesanan oleh Admin

```mermaid
sequenceDiagram
    actor A as Admin
    participant W as Halaman Web (admin.js)
    participant L as LocalStorage

    A->>W: Buka halaman Data Pesanan
    W->>W: requireRole("admin")
    W->>L: Baca rs_orders
    L-->>W: Daftar pesanan
    W-->>A: Tampilkan tabel pesanan

    A->>W: Klik Detail
    W-->>A: Modal detail dengan pilihan status (hanya maju atau Dibatalkan)

    A->>W: Pilih status baru dan klik Simpan Status
    alt Status baru Diambil/Dikirim dan belum ada pembayaran Lunas
        W-->>A: Pesan "pembayaran harus Lunas"
    else Memenuhi aturan
        W->>L: Simpan status_order baru
        W-->>A: Toast status diubah, tabel diperbarui
    end
    Note over A,L: Pelanggan melihat progres terbaru di halaman Status Pesanan
```

Pilihan status dibatasi oleh fungsi `opsiStatus()`, sehingga status tidak bisa mundur. Aturan BR-11 diperiksa sebelum menyimpan.

## Pemetaan ke API Rancangan

| Proses | Endpoint rancangan (`API-Documentation.md`) |
|---|---|
| A. Registrasi, login | `POST /auth/register`, `POST /auth/login` |
| B. Pemesanan | `GET /services`, `POST /orders` |
| C. Pembayaran, verifikasi | `POST /payments`, `PATCH /payments/:id/status` |
| D. Ubah status | `GET /orders`, `PATCH /orders/:id/status` |

Saat backend dibuat, "LocalStorage" digantikan database MySQL dan logika validasi pindah ke server.