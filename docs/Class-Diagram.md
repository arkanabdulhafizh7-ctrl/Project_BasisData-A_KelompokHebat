# Class Diagram ROALSHOES

Class Diagram berikut sesuai dengan struktur data (`config/data.js`) dan fungsi JavaScript di `auth.js`, `order.js`, dan `admin.js`. Method adalah nama fungsi yang berperan sama di kode.

```mermaid
classDiagram
    class User {
        <<abstract>>
        #int id_user
        #string nama
        #string username
        #string email
        #string password
        #string no_hp
        #string alamat
        #string role
        +login(identitas, password) bool
        +logout() void
    }
    class Customer {
        +registrasi(data) bool
        +ubahProfil(data) bool
        +buatPesanan(id_service, merek, jumlah, catatan) Order
        +bayar(id_order, metode, referensi) Payment
        +batalkanPesanan(id_order) bool
        +lihatStatus() List~Order~
        +lihatRiwayat() List~Order~
    }
    class Admin {
        +lihatDashboard() Statistik
        +kelolaLayanan(aksi, data) bool
        +cariPelanggan(kata) List~Customer~
        +hapusPelanggan(id_user) bool
        +ubahStatusPesanan(id_order, status) bool
        +verifikasiPembayaran(id_payment, status) bool
        +ubahCatatan(id_order, catatan) bool
        +hapusPesanan(id_order) bool
    }
    class Service {
        -int id_service
        -string nama_layanan
        -string deskripsi
        -int harga
        -int estimasi_hari
        -int is_active
        +tambah() bool
        +ubah() bool
        +hapusAtauNonaktifkan() bool
    }
    class Order {
        -int id_order
        -int id_user
        -string kode_order
        -date tanggal_order
        -int total_harga
        -string status_order
        -string catatan
        +hitungTotal() int
        +ubahStatus(status) bool
        +bolehDibatalkan() bool
    }
    class OrderDetail {
        -int id_detail
        -int id_service
        -string merek_sepatu
        -int jumlah
        -int harga_satuan
        -int subtotal
        +hitungSubtotal() int
    }
    class Payment {
        -int id_payment
        -string metode
        -int jumlah_bayar
        -string referensi
        -string status_bayar
        -date tanggal_bayar
        +verifikasi(status) bool
    }

    User <|-- Customer
    User <|-- Admin
    Customer "1" --> "0..*" Order : membuat
    Order "1" *-- "1..*" OrderDetail : berisi
    Order "1" *-- "0..*" Payment : dibayar melalui
    Service "1" <-- "0..*" OrderDetail : dipesan dalam
    Admin ..> Service : mengelola
    Admin ..> Order : memperbarui
    Admin ..> Payment : memverifikasi
```

## Keterangan

| Simbol | Arti |
|---|---|
| `+` / `-` / `#` | Public / private / protected |
| `<|--` | Pewarisan: Customer dan Admin adalah jenis User |
| `*--` | Komposisi: item dan pembayaran tidak ada tanpa pesanan |
| `-->` | Asosiasi dengan multiplicity |
| `..>` | Ketergantungan (admin menggunakan atau mengubah objek tersebut) |

## Pemetaan ke Kode

| Class | Implementasi |
|---|---|
| User, Customer, Admin | Satu tabel `users` dengan kolom `role`. Dua kelas dipakai untuk memisahkan perilaku di UML |
| Service | `rs_services`, fungsi di `admin.js` (`initLayanan`) |
| Order, OrderDetail, Payment | `rs_orders` (`details[]`, `payments[]`), fungsi di `order.js` dan `admin.js` |
| `login`, `registrasi` | `auth.js` |
| `buatPesanan`, `bayar`, `batalkanPesanan` | `initPemesanan`, `initStatus` di `order.js` |
| `ubahStatusPesanan`, `verifikasiPembayaran` | `initPesanan`, `ubahPembayaran` di `admin.js` |