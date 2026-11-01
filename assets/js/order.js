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
let idBayar = null;

function bolehBayar(o) {
  if (o.status_order === "Dibatalkan") return false;
  return !o.payments.some(p => p.status_bayar === "Menunggu Verifikasi" || p.status_bayar === "Lunas");
}

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
      ? `${bayar.metode} · ${rupiah(bayar.jumlah_bayar)} ${badgeStatus(bayar.status_bayar)}`
      : "Belum ada pembayaran";
    const bisaBatal = ["Pending", "Dikonfirmasi"].includes(o.status_order);

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
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${bolehBayar(o) ? `<button class="btn btn-primary btn-sm" data-aksi="bayar" data-id="${o.id_order}">Bayar</button>` : ""}
        ${bisaBatal ? `<button class="btn btn-danger btn-sm" data-aksi="batal" data-id="${o.id_order}">Batalkan</button>` : ""}
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
    if (tombol.dataset.aksi === "bayar") bukaFormBayar(id);
    if (tombol.dataset.aksi === "batal") {
      konfirmasi("Yakin ingin membatalkan pesanan ini?", () => {
        const orders = DB.get("orders");
        const o = orders.find(x => x.id_order === id);
        if (o && ["Pending", "Dikonfirmasi"].includes(o.status_order)) {
          o.status_order = "Dibatalkan";
          DB.set("orders", orders);
          toast("Pesanan dibatalkan.");
          renderStatus();
        }
      });
    }
  });

  $("btn-tutup-bayar").addEventListener("click", () => tutupModal("modal-bayar"));
  $("form-bayar").addEventListener("submit", e => {
    e.preventDefault();
    const metode = $("metode").value;
    const ref = $("referensi").value.trim();
    if (metode !== "Tunai" && ref.length < 3) {
      $("pesan-bayar").textContent = "Isi nomor referensi/bukti pembayaran.";
      $("pesan-bayar").className = "alert show alert-error";
      return;
    }
    const orders = DB.get("orders");
    const o = orders.find(x => x.id_order === idBayar);
    if (!o || !bolehBayar(o)) return tutupModal("modal-bayar");

    const semuaBayar = orders.flatMap(x => x.payments);
    o.payments.push({
      id_payment: DB.nextId(semuaBayar, "id_payment"),
      metode, jumlah_bayar: o.total_harga, referensi: ref || "-",
      status_bayar: "Menunggu Verifikasi", tanggal_bayar: hariIni()
    });
    DB.set("orders", orders);
    tutupModal("modal-bayar");
    toast("Pembayaran dicatat, menunggu verifikasi admin.");
    renderStatus();
  });
}

function bukaFormBayar(id) {
  const o = DB.get("orders").find(x => x.id_order === id);
  if (!o) return;
  idBayar = id;
  $("info-bayar").textContent = `${o.kode_order} · Total ${rupiah(o.total_harga)}`;
  $("metode").innerHTML = METODE_BAYAR.map(m => `<option>${m}</option>`).join("");
  $("referensi").value = "";
  $("pesan-bayar").className = "alert";
  bukaModal("modal-bayar");
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