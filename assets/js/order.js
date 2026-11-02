/* ==========================================================
   ROALSHOES - order.js
   Logika halaman pelanggan: pemesanan, status, riwayat, profil.
   Membutuhkan config/data.js dan assets/js/script.js
   ========================================================== */

const $ = id => document.getElementById(id);

/* ---------- Helper ---------- */
function pesananSaya() {
  const s = getSession();
  return DB.get("orders")
    .filter(o => o.id_user === s.id_user)
    .sort((a, b) => b.id_order - a.id_order);
}
function ringkasLayanan(o) {
  return o.details.map(d => `${d.nama_layanan} ×${d.jumlah}`).join(", ");
}
function buatKodeOrder(orders) {
  const tgl = hariIni();
  const nomor = orders.filter(o => o.tanggal_order === tgl).length + 1;
  return `RS-${tgl.replace(/-/g, "")}-${String(nomor).padStart(3, "0")}`;
}

/* ---------- Helper pembayaran ---------- */

// Cari pesanan berdasarkan id, hanya jika milik pelanggan yang sedang login.
// Mencegah pelanggan membayar/membatalkan pesanan orang lain lewat data-id.
function cariOrderSaya(orders, id) {
  const s = getSession();
  return orders.find(x => x.id_order === id && x.id_user === s.id_user);
}

// Sudah ada pembayaran yang sedang diproses atau sudah lunas.
function sudahBayar(o) {
  return o.payments.some(p => p.status_bayar === "Menunggu Verifikasi" || p.status_bayar === "Lunas");
}

function bolehBayar(o) {
  if (o.status_order === "Dibatalkan") return false;
  return !sudahBayar(o);
}

// Pesanan yang sudah dibayar (atau sedang diverifikasi) tidak boleh
// dibatalkan sendiri oleh pelanggan, supaya uang tidak "hilang".
function bolehBatal(o) {
  return ["Pending", "Dikonfirmasi"].includes(o.status_order) && !sudahBayar(o);
}

/* ==========================================================
   PEMESANAN
   ========================================================== */
function initPemesanan() {
  if (!requireRole("pelanggan")) return;
  const user = currentUser();
  const layanan = DB.get("services").filter(s => s.is_active);

  $("nama").value = user.nama;
  $("no_hp").value = user.no_hp || "";
  $("layanan").innerHTML = '<option value="">-- Pilih layanan --</option>' +
    layanan.map(s => `<option value="${s.id_service}">${escapeHtml(s.nama_layanan)} - ${rupiah(s.harga)}</option>`).join("");

  // Pilih otomatis dari link ?layanan=ID
  const dariUrl = new URLSearchParams(location.search).get("layanan");
  if (dariUrl) $("layanan").value = dariUrl;

  function hitung() {
    const s = layanan.find(x => x.id_service === Number($("layanan").value));
    const jml = parseInt($("jumlah").value, 10) || 0;
    $("total").textContent = rupiah(s ? s.harga * jml : 0);
    $("estimasi").textContent = s ? `Estimasi pengerjaan ${s.estimasi_hari} hari` : "";
  }
  $("layanan").addEventListener("change", hitung);
  $("jumlah").addEventListener("input", hitung);
  hitung();

  $("form-order").addEventListener("submit", e => {
    e.preventDefault();
    const s = layanan.find(x => x.id_service === Number($("layanan").value));
    const merek = $("merek").value.trim();
    const jml = parseInt($("jumlah").value, 10);
    const hp = $("no_hp").value.trim();

    if (!s) return tampil("Pilih jenis layanan terlebih dahulu.");
    if (merek.length < 2) return tampil("Merek atau jenis sepatu wajib diisi.");
    if (!jml || jml < 1 || jml > 20) return tampil("Jumlah sepatu harus 1 sampai 20.");
    if (!/^[0-9]{9,14}$/.test(hp)) return tampil("Nomor telepon harus 9-14 digit angka.");

    const orders = DB.get("orders");
    const semuaDetail = orders.flatMap(o => o.details);
    const subtotal = s.harga * jml;

    orders.push({
      id_order: DB.nextId(orders, "id_order"),
      id_user: user.id_user,
      kode_order: buatKodeOrder(orders),
      tanggal_order: hariIni(),
      total_harga: subtotal,
      status_order: "Pending",
      catatan: $("catatan").value.trim(),
      details: [{
        id_detail: DB.nextId(semuaDetail, "id_detail"),
        id_service: s.id_service, nama_layanan: s.nama_layanan,
        merek_sepatu: merek, jumlah: jml,
        harga_satuan: s.harga, subtotal: subtotal
      }],
      payments: []
    });
    DB.set("orders", orders);

    // simpan no. HP terbaru ke profil
    const users = DB.get("users");
    const u = users.find(x => x.id_user === user.id_user);
    u.no_hp = hp;
    DB.set("users", users);

    toast("Pesanan berhasil dibuat!");
    setTimeout(() => (location.href = "status-pesanan.html"), 1000);
  });

  function tampil(teks) {
    const a = $("pesan");
    a.textContent = teks;
    a.className = "alert show alert-error";
  }
}

/* ==========================================================
   STATUS PESANAN (+ pembayaran + pembatalan)
   ========================================================== */
function renderStatus() {
  const daftar = pesananSaya();
  const alur = STATUS_PESANAN.filter(s => s !== "Dibatalkan");
  const wadah = $("daftar-status");

  if (!daftar.length) {
    wadah.innerHTML = '<div class="card empty">Belum ada pesanan. <a class="accent" href="pemesanan.html"><strong>Buat pesanan</strong></a></div>';
    return;
  }

  wadah.innerHTML = daftar.map(o => {
    const idx = alur.indexOf(o.status_order);
    const progres = o.status_order === "Dibatalkan"
      ? '<p style="margin:14px 0">Pesanan ini dibatalkan.</p>'
      : `<div class="progress">${alur.map((st, i) =>
          `<div class="step ${i <= idx ? "done" : ""}">${st}</div>`).join("")}</div>`;
    const bayar = o.payments.length ? o.payments[o.payments.length - 1] : null;
    const infoBayar = bayar
      ? `${escapeHtml(bayar.metode)} · ${rupiah(bayar.jumlah_bayar)} ${badgeStatus(bayar.status_bayar)}`
      : "Belum ada pembayaran";
    const bisaBatal = bolehBatal(o);
    const catatanBatal = !bisaBatal && sudahBayar(o) && ["Pending", "Dikonfirmasi"].includes(o.status_order)
      ? '<small>Pesanan yang sudah dibayar tidak dapat dibatalkan sendiri. Silakan hubungi admin.</small>'
      : "";

    return `<div class="card" style="margin-bottom:18px">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div><strong>${escapeHtml(o.kode_order)}</strong><br>
          <small>Dipesan ${tanggalIndo(o.tanggal_order)}</small></div>
        <div>${badgeStatus(o.status_order)}</div>
      </div>
      <p style="margin-top:10px"><strong>Layanan:</strong> ${escapeHtml(ringkasLayanan(o))}</p>
      <p><strong>Sepatu:</strong> ${escapeHtml(o.details.map(d => d.merek_sepatu).join(", "))}</p>
      <p><strong>Total:</strong> ${rupiah(o.total_harga)}</p>
      <p><strong>Pembayaran:</strong> ${infoBayar}</p>
      ${progres}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        ${bolehBayar(o) ? `<button class="btn btn-primary btn-sm" data-aksi="bayar" data-id="${o.id_order}">Bayar</button>` : ""}
        ${bisaBatal ? `<button class="btn btn-danger btn-sm" data-aksi="batal" data-id="${o.id_order}">Batalkan</button>` : ""}
        ${catatanBatal}
      </div></div>`;
  }).join("");
}

function initStatus() {
  if (!requireRole("pelanggan")) return;
  renderStatus();

  $("daftar-status").addEventListener("click", e => {
    const tombol = e.target.closest("button[data-aksi]");
    if (!tombol) return;
    const id = Number(tombol.dataset.id);
    if (tombol.dataset.aksi === "bayar") bukaFormBayar(id, tombol);
    if (tombol.dataset.aksi === "batal") {
      konfirmasi("Yakin ingin membatalkan pesanan ini?", () => {
        const orders = DB.get("orders");
        const o = cariOrderSaya(orders, id);
        if (!o) return;
        // Cek ulang saat dikonfirmasi: pembayaran bisa saja masuk setelah tombol dirender
        if (!bolehBatal(o)) {
          toast("Pesanan ini tidak dapat dibatalkan.");
          renderStatus();
          return;
        }
        o.status_order = "Dibatalkan";
        DB.set("orders", orders);
        toast("Pesanan dibatalkan.");
        renderStatus();
      });
    }
  });
}

/* ==========================================================
   PEMBAYARAN
   Modal 3 langkah:
     1) pilih metode  ->  2) detail pembayaran  ->  3) pembayaran berhasil
   Modal dibuat lewat JS, jadi tidak bergantung pada #modal-bayar di HTML
   (blok #modal-bayar di status-pesanan.html sudah tidak dipakai).
   ========================================================== */

// Status pembayaran setelah pelanggan menekan tombol konfirmasi.
// CATATAN: ini simulasi. Sistem belum terhubung ke bank/payment gateway,
// jadi tidak bisa memastikan uang benar-benar masuk. Kalau admin tetap harus
// memeriksa tiap pembayaran, ubah STATUS_BAYAR_DIGITAL jadi "Menunggu Verifikasi".
const STATUS_BAYAR_DIGITAL = "Lunas";
// Tunai baru sah setelah uang diterima kasir/admin, jadi tetap perlu verifikasi.
const STATUS_BAYAR_TUNAI = "Menunggu Verifikasi";

// Tujuan pembayaran toko. GANTI dengan data asli sebelum dipakai pelanggan.
const DATA_PEMBAYARAN = {
  // Halaman ini ada di folder customer/, jadi perlu "../" untuk naik satu folder.
  qris: "../assets/img/qris.png", // simpan gambar QRIS toko di assets/img/qris.png
  rekening: [{ label: "BCA", nomor: "0000000000", atasNama: "ROALSHOES" }],
  ewallet: [{ label: "DANA", nomor: "080000000000", atasNama: "ROALSHOES" }]
};

let idBayar = null;
let metodeDipilih = "";
let kotakBayar = null; // elemen overlay modal pembayaran

// Tentukan jenis metode dari namanya, karena daftar METODE_BAYAR bisa berubah.
function jenisMetode(nama) {
  const n = String(nama).toLowerCase();
  if (n.includes("qris")) return "qris";
  if (n.includes("tunai") || n.includes("cash")) return "tunai";
  if (/dana|ovo|gopay|shopee|linkaja|wallet/.test(n)) return "ewallet";
  if (/transfer|bank|bca|bri|bni|mandiri|rekening/.test(n)) return "rekening";
  return "lainnya";
}

function pasangGayaBayar() {
  if ($("gaya-bayar")) return;
  const st = document.createElement("style");
  st.id = "gaya-bayar";
  st.textContent = `
.pay-overlay{--pay-accent:#ff6a00;position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,15,15,.5)}
.pay-box{width:100%;max-width:440px;max-height:92vh;overflow-y:auto;padding:24px;border-radius:16px;background:#fff;color:#1a1a1a;box-shadow:0 20px 50px rgba(0,0,0,.28)}
.pay-box h3{margin:0 0 6px;font-size:1.25rem}
.pay-sub{margin:0 0 18px;color:#555}
.pay-label{margin:0 0 8px;font-weight:600}
.pay-metode{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}
.pay-opsi{display:flex;align-items:center;gap:12px;width:100%;padding:13px 14px;border:1.5px solid #e2e2e2;border-radius:12px;background:#fff;color:inherit;font:inherit;text-align:left;cursor:pointer}
.pay-opsi:hover{border-color:var(--pay-accent)}
.pay-opsi[aria-pressed="true"]{border-color:var(--pay-accent);background:color-mix(in srgb,var(--pay-accent) 10%,#fff)}
.pay-dot{flex:none;width:18px;height:18px;border:2px solid #bbb;border-radius:50%}
.pay-opsi[aria-pressed="true"] .pay-dot{border-color:var(--pay-accent);background:radial-gradient(circle,var(--pay-accent) 45%,transparent 50%)}
.pay-aksi{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
.pay-box .pay-ghost{background:#fff;color:var(--pay-accent);border:1.5px solid var(--pay-accent)}
.pay-box .btn[disabled]{opacity:.5;cursor:not-allowed}
.pay-box .pay-penuh{width:100%}
.pay-total{margin:0 0 4px;font-size:1.6rem;font-weight:700}
.pay-qr-wadah{display:flex;justify-content:center;margin:14px 0}
.pay-qr{width:220px;max-width:100%;height:auto;padding:8px;border:1px solid #e2e2e2;border-radius:12px;background:#fff}
.pay-qr-kosong{display:none;padding:28px 16px;border:2px dashed #ccc;border-radius:12px;text-align:center;color:#666;font-size:.9rem}
.pay-akun{display:flex;flex-direction:column;gap:2px;margin:10px 0;padding:12px 14px;border:1.5px solid #e2e2e2;border-radius:12px}
.pay-akun strong{font-size:1.15rem;letter-spacing:.5px}
.pay-catatan{margin:12px 0 20px;color:#555;font-size:.92rem}
.pay-sukses{text-align:center}
.pay-centang{display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;margin-bottom:12px;border-radius:50%;background:#e7f7ec;color:#1e9e4a}
.pay-ringkas{margin:18px 0 22px;padding:12px 14px;border-radius:12px;background:#f7f7f7;text-align:left}
.pay-ringkas div{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:5px 0}
.pay-ringkas dt{color:#666}
.pay-ringkas dd{margin:0;font-weight:600;text-align:right}`;
  document.head.appendChild(st);
}

function tombolEsc(e) {
  if (e.key === "Escape") tutupBayar();
}

function tutupBayar() {
  idBayar = null;
  metodeDipilih = "";
  document.removeEventListener("keydown", tombolEsc);
  if (kotakBayar) {
    kotakBayar.remove();
    kotakBayar = null;
  }
}

function isiBayar(html) {
  kotakBayar.querySelector(".pay-box").innerHTML = html;
  const fokus = kotakBayar.querySelector("button:not([disabled])");
  if (fokus) fokus.focus();
}

function bukaFormBayar(id, tombol) {
  const o = cariOrderSaya(DB.get("orders"), id);
  if (!o) return;
  if (!bolehBayar(o)) {
    toast("Pesanan ini tidak dapat dibayar (mungkin sudah dibayar atau dibatalkan).");
    renderStatus();
    return;
  }
  tutupBayar(); // pastikan tidak ada modal ganda
  idBayar = id;
  pasangGayaBayar();

  kotakBayar = document.createElement("div");
  kotakBayar.className = "pay-overlay";
  kotakBayar.setAttribute("role", "dialog");
  kotakBayar.setAttribute("aria-modal", "true");
  kotakBayar.setAttribute("aria-labelledby", "judul-bayar");
  kotakBayar.innerHTML = '<div class="pay-box"></div>';

  // Pakai warna tombol "Bayar" sebagai warna aksen modal agar senada dengan situs
  const aksen = tombol ? getComputedStyle(tombol).backgroundColor : "";
  if (aksen && aksen !== "rgba(0, 0, 0, 0)" && aksen !== "transparent") {
    kotakBayar.style.setProperty("--pay-accent", aksen);
  }

  kotakBayar.addEventListener("click", klikBayar);
  document.body.appendChild(kotakBayar);
  document.addEventListener("keydown", tombolEsc);
  langkahPilihMetode(o);
}

function klikBayar(e) {
  const el = e.target.closest("[data-metode], [data-pay]");
  if (!el || !kotakBayar) return;
  const aksi = el.dataset.pay;
  if (aksi === "batal" || aksi === "selesai") return tutupBayar();

  // Ambil data terbaru setiap klik: pesanan bisa berubah (dibayar/dibatalkan) di tab lain
  const orders = DB.get("orders");
  const o = cariOrderSaya(orders, idBayar);
  if (!o || !bolehBayar(o)) {
    tutupBayar();
    toast("Pesanan ini tidak dapat dibayar (mungkin sudah dibayar atau dibatalkan).");
    renderStatus();
    return;
  }

  if (el.dataset.metode !== undefined) {
    if (!METODE_BAYAR.includes(el.dataset.metode)) return;
    metodeDipilih = el.dataset.metode;
    return langkahPilihMetode(o);
  }
  if (aksi === "lanjut" && metodeDipilih) return langkahDetailBayar(o);
  if (aksi === "kembali") return langkahPilihMetode(o);
  if (aksi === "konfirmasi") return konfirmasiBayar(orders, o);
}

/* Langkah 1: pilih metode pembayaran */
function langkahPilihMetode(o) {
  const opsi = METODE_BAYAR.map(m =>
    `<button type="button" class="pay-opsi" data-metode="${escapeHtml(m)}" aria-pressed="${m === metodeDipilih}">
      <span class="pay-dot"></span>${escapeHtml(m)}</button>`).join("");

  isiBayar(`
    <h3 id="judul-bayar">Pembayaran Pesanan</h3>
    <p class="pay-sub">${escapeHtml(o.kode_order)} · Total ${rupiah(o.total_harga)}</p>
    <p class="pay-label">Pilih metode pembayaran</p>
    <div class="pay-metode">${opsi}</div>
    <div class="pay-aksi">
      <button type="button" class="btn btn-sm pay-ghost" data-pay="batal">Batal</button>
      <button type="button" class="btn btn-primary btn-sm" data-pay="lanjut" ${metodeDipilih ? "" : "disabled"}>
        ${metodeDipilih ? `Lanjut dengan ${escapeHtml(metodeDipilih)}` : "Pilih metode dulu"}</button>
    </div>`);
}

/* Langkah 2: detail pembayaran sesuai metode yang dipilih */
function langkahDetailBayar(o) {
  const jenis = jenisMetode(metodeDipilih);
  const n = metodeDipilih.toLowerCase();
  let isi;

  if (jenis === "qris") {
    const gambar = escapeHtml(DATA_PEMBAYARAN.qris);
    isi = `<div class="pay-qr-wadah">
        <img class="pay-qr" src="${gambar}" alt="Kode QRIS ROALSHOES"
          onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
        <div class="pay-qr-kosong">Gambar QRIS belum dipasang.<br>Simpan di <code>${gambar}</code></div>
      </div>
      <p class="pay-catatan">Scan kode QR di atas dengan aplikasi e-wallet atau mobile banking, lalu bayar sesuai total.</p>`;
  } else if (jenis === "rekening" || jenis === "ewallet") {
    const semua = DATA_PEMBAYARAN[jenis];
    const cocok = semua.filter(a => n.includes(a.label.toLowerCase()));
    isi = (cocok.length ? cocok : semua).map(a =>
      `<div class="pay-akun"><small>${escapeHtml(a.label)}</small>
        <strong>${escapeHtml(a.nomor)}</strong>
        <small>a.n. ${escapeHtml(a.atasNama)}</small></div>`).join("") +
      `<p class="pay-catatan">Kirim tepat sesuai total pembayaran ke nomor di atas.</p>`;
  } else if (jenis === "tunai") {
    isi = `<p class="pay-catatan">Bayar tunai langsung di toko saat menyerahkan atau mengambil sepatu.
      Sebutkan kode pesanan <strong>${escapeHtml(o.kode_order)}</strong> kepada kasir.</p>`;
  } else {
    isi = `<p class="pay-catatan">Lakukan pembayaran sesuai instruksi dari admin, lalu tekan tombol di bawah.</p>`;
  }

  isiBayar(`
    <h3 id="judul-bayar">Bayar dengan ${escapeHtml(metodeDipilih)}</h3>
    <p class="pay-sub">${escapeHtml(o.kode_order)}</p>
    <p class="pay-total">${rupiah(o.total_harga)}</p>
    ${isi}
    <div class="pay-aksi">
      <button type="button" class="btn btn-sm pay-ghost" data-pay="kembali">Kembali</button>
      <button type="button" class="btn btn-primary btn-sm" data-pay="konfirmasi">
        ${jenis === "tunai" ? "Catat Pembayaran Tunai" : "Saya Sudah Bayar"}</button>
    </div>`);
}

/* Simpan pembayaran lalu tampilkan layar berhasil */
function konfirmasiBayar(orders, o) {
  if (!METODE_BAYAR.includes(metodeDipilih)) return langkahPilihMetode(o);

  const semuaBayar = orders.flatMap(x => x.payments);
  const bayar = {
    id_payment: DB.nextId(semuaBayar, "id_payment"),
    metode: metodeDipilih,
    jumlah_bayar: o.total_harga,
    referensi: "-",
    status_bayar: jenisMetode(metodeDipilih) === "tunai" ? STATUS_BAYAR_TUNAI : STATUS_BAYAR_DIGITAL,
    tanggal_bayar: hariIni()
  };
  o.payments.push(bayar);
  DB.set("orders", orders);

  renderStatus(); // perbarui daftar pesanan di belakang modal
  langkahBerhasil(o, bayar);
}

/* Langkah 3: pembayaran berhasil */
function langkahBerhasil(o, bayar) {
  const tunai = jenisMetode(bayar.metode) === "tunai";
  isiBayar(`
    <div class="pay-sukses">
      <div class="pay-centang" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
      </div>
      <h3 id="judul-bayar">Pembayaran Berhasil</h3>
      <p class="pay-sub">${tunai
        ? "Pembayaran tunai Anda sudah dicatat. Admin akan memverifikasinya saat uang diterima."
        : "Terima kasih, pembayaran Anda sudah kami terima."}</p>
      <dl class="pay-ringkas">
        <div><dt>Kode pesanan</dt><dd>${escapeHtml(o.kode_order)}</dd></div>
        <div><dt>Metode</dt><dd>${escapeHtml(bayar.metode)}</dd></div>
        <div><dt>Jumlah</dt><dd>${rupiah(bayar.jumlah_bayar)}</dd></div>
        <div><dt>Tanggal</dt><dd>${tanggalIndo(bayar.tanggal_bayar)}</dd></div>
        <div><dt>Status</dt><dd>${badgeStatus(bayar.status_bayar)}</dd></div>
      </dl>
      <button type="button" class="btn btn-primary pay-penuh" data-pay="selesai">Selesai</button>
    </div>`);
}

/* ==========================================================
   RIWAYAT
   ========================================================== */
function initRiwayat() {
  if (!requireRole("pelanggan")) return;
  const daftar = pesananSaya();
  $("isi-riwayat").innerHTML = daftar.length
    ? daftar.map(o => {
        const b = o.payments.length ? o.payments[o.payments.length - 1].status_bayar : "Belum bayar";
        return `<tr>
          <td>${escapeHtml(o.kode_order)}</td>
          <td>${tanggalIndo(o.tanggal_order)}</td>
          <td>${escapeHtml(ringkasLayanan(o))}</td>
          <td>${rupiah(o.total_harga)}</td>
          <td>${badgeStatus(o.status_order)}</td>
          <td>${o.payments.length ? badgeStatus(b) : "Belum bayar"}</td></tr>`;
      }).join("")
    : '<tr><td colspan="6" class="empty">Belum ada riwayat pesanan.</td></tr>';
}

/* ==========================================================
   PROFIL
   ========================================================== */
function initProfil() {
  if (!requireRole("pelanggan")) return;
  const u = currentUser();
  $("nama").value = u.nama;
  $("email").value = u.email;
  $("no_hp").value = u.no_hp || "";
  $("alamat").value = u.alamat || "";

  $("form-profil").addEventListener("submit", e => {
    e.preventDefault();
    const nama = $("nama").value.trim();
    const hp = $("no_hp").value.trim();
    const passBaru = $("password_baru").value;
    const a = $("pesan");
    const gagal = teks => { a.textContent = teks; a.className = "alert show alert-error"; };

    if (nama.length < 3) return gagal("Nama minimal 3 karakter.");
    if (!/^[0-9]{9,14}$/.test(hp)) return gagal("Nomor telepon harus 9-14 digit angka.");
    if (passBaru && passBaru.length < 6) return gagal("Password baru minimal 6 karakter.");

    const users = DB.get("users");
    const data = users.find(x => x.id_user === u.id_user);
    data.nama = nama; data.no_hp = hp; data.alamat = $("alamat").value.trim();
    if (passBaru) data.password = passBaru;
    DB.set("users", users);
    setSession(data);

    $("password_baru").value = "";
    a.textContent = "Perubahan profil berhasil disimpan.";
    a.className = "alert show alert-success";
  });
}

/* ---------- Pilih fungsi sesuai halaman ---------- */
if ($("form-order")) initPemesanan();
if ($("daftar-status")) initStatus();
if ($("isi-riwayat")) initRiwayat();
if ($("form-profil")) initProfil();