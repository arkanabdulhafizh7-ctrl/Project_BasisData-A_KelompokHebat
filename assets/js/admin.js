/* ==========================================================
   ROALSHOES - admin.js
   Logika halaman admin: dashboard, layanan, pelanggan, pesanan.
   Membutuhkan config/data.js dan assets/js/script.js
   ========================================================== */

const $ = id => document.getElementById(id);

/* ---------- Helper ---------- */
function namaUser(id) {
  const u = DB.get("users").find(x => x.id_user === id);
  return u ? u.nama : "(dihapus)";
}
function ringkasLayanan(o) {
  return o.details.map(d => `${d.nama_layanan} ×${d.jumlah}`).join(", ");
}
function statusBayarTerakhir(o) {
  return o.payments.length ? o.payments[o.payments.length - 1].status_bayar : null;
}
function sudahLunas(o) {
  return o.payments.some(p => p.status_bayar === "Lunas");
}
function pesanForm(id, teks, tipe) {
  const a = $(id);
  a.textContent = teks;
  a.className = "alert show alert-" + tipe;
}

/* ==========================================================
   DASHBOARD
   ========================================================== */
function initDashboard() {
  if (!requireRole("admin")) return;
  const users = DB.get("users").filter(u => u.role === "pelanggan");
  const orders = DB.get("orders");

  const dikerjakan = orders.filter(o => o.status_order === "Sedang Dikerjakan").length;
  const selesai = orders.filter(o => ["Selesai", "Diambil/Dikirim"].includes(o.status_order)).length;
  const transaksi = orders.flatMap(o => o.payments)
    .filter(p => p.status_bayar === "Lunas")
    .reduce((jml, p) => jml + p.jumlah_bayar, 0);

  $("stat-pelanggan").textContent = users.length;
  $("stat-pesanan").textContent = orders.length;
  $("stat-dikerjakan").textContent = dikerjakan;
  $("stat-selesai").textContent = selesai;
  $("stat-transaksi").textContent = rupiah(transaksi);

  const terbaru = [...orders].sort((a, b) => b.id_order - a.id_order).slice(0, 5);
  $("isi-terbaru").innerHTML = terbaru.length
    ? terbaru.map(o => `<tr>
        <td>${escapeHtml(o.kode_order)}</td>
        <td>${escapeHtml(namaUser(o.id_user))}</td>
        <td>${escapeHtml(ringkasLayanan(o))}</td>
        <td>${rupiah(o.total_harga)}</td>
        <td>${badgeStatus(o.status_order)}</td></tr>`).join("")
    : '<tr><td colspan="5" class="empty">Belum ada pesanan.</td></tr>';
}

/* ==========================================================
   LAYANAN (CRUD)
   ========================================================== */
function renderLayanan() {
  const list = DB.get("services");
  $("isi-layanan").innerHTML = list.length
    ? list.map(s => `<tr>
        <td>${s.id_service}</td>
        <td><strong>${escapeHtml(s.nama_layanan)}</strong><br><small>${escapeHtml(s.deskripsi)}</small></td>
        <td>${rupiah(s.harga)}</td>
        <td>${s.estimasi_hari} hari</td>
        <td>${s.is_active ? '<span class="badge badge-selesai">Aktif</span>' : '<span class="badge badge-batal">Nonaktif</span>'}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-outline btn-sm" data-aksi="edit" data-id="${s.id_service}">Edit</button>
          <button class="btn btn-danger btn-sm" data-aksi="hapus" data-id="${s.id_service}">Hapus</button>
        </td></tr>`).join("")
    : '<tr><td colspan="6" class="empty">Belum ada layanan.</td></tr>';
}

function bukaFormLayanan(id) {
  $("pesan-layanan").className = "alert";
  $("form-layanan").reset();
  $("id_service").value = "";
  $("judul-layanan").textContent = "Tambah Layanan";
  if (id) {
    const s = DB.get("services").find(x => x.id_service === id);
    if (!s) return;
    $("judul-layanan").textContent = "Edit Layanan";
    $("id_service").value = s.id_service;
    $("nama_layanan").value = s.nama_layanan;
    $("deskripsi").value = s.deskripsi;
    $("harga").value = s.harga;
    $("estimasi_hari").value = s.estimasi_hari;
    $("is_active").value = s.is_active;
  }
  bukaModal("modal-layanan");
}

function initLayanan() {
  if (!requireRole("admin")) return;
  renderLayanan();

  $("btn-tambah").addEventListener("click", () => bukaFormLayanan(null));
  $("btn-batal-layanan").addEventListener("click", () => tutupModal("modal-layanan"));

  $("isi-layanan").addEventListener("click", e => {
    const t = e.target.closest("button[data-aksi]");
    if (!t) return;
    const id = Number(t.dataset.id);
    if (t.dataset.aksi === "edit") bukaFormLayanan(id);
    if (t.dataset.aksi === "hapus") {
      konfirmasi("Hapus layanan ini? Jika sudah pernah dipesan, layanan hanya dinonaktifkan.", () => {
        const dipakai = DB.get("orders").some(o => o.details.some(d => d.id_service === id));
        let list = DB.get("services");
        if (dipakai) {
          list.find(s => s.id_service === id).is_active = 0;
          toast("Layanan sudah pernah dipesan, jadi dinonaktifkan.");
        } else {
          list = list.filter(s => s.id_service !== id);
          toast("Layanan dihapus.");
        }
        DB.set("services", list);
        renderLayanan();
      });
    }
  });

  $("form-layanan").addEventListener("submit", e => {
    e.preventDefault();
    const nama = $("nama_layanan").value.trim();
    const desk = $("deskripsi").value.trim();
    const harga = parseInt($("harga").value, 10);
    const est = parseInt($("estimasi_hari").value, 10);

    if (nama.length < 3) return pesanForm("pesan-layanan", "Nama layanan minimal 3 karakter.", "error");
    if (desk.length < 5) return pesanForm("pesan-layanan", "Deskripsi wajib diisi.", "error");
    if (!harga || harga < 1000) return pesanForm("pesan-layanan", "Harga minimal Rp1.000.", "error");
    if (!est || est < 1 || est > 30) return pesanForm("pesan-layanan", "Estimasi 1 sampai 30 hari.", "error");

    const list = DB.get("services");
    const id = Number($("id_service").value);
    const data = { nama_layanan: nama, deskripsi: desk, harga, estimasi_hari: est, is_active: Number($("is_active").value) };

    if (id) {
      Object.assign(list.find(s => s.id_service === id), data);
      toast("Layanan diperbarui.");
    } else {
      list.push({ id_service: DB.nextId(list, "id_service"), ...data });
      toast("Layanan ditambahkan.");
    }
    DB.set("services", list);
    tutupModal("modal-layanan");
    renderLayanan();
  });
}

/* ==========================================================
   PELANGGAN (lihat, cari, detail, hapus)
   ========================================================== */
function renderPelanggan() {
  const kata = $("cari").value.trim().toLowerCase();
  const orders = DB.get("orders");
  const list = DB.get("users").filter(u => u.role === "pelanggan" &&
    (u.nama + " " + u.email + " " + (u.no_hp || "")).toLowerCase().includes(kata));

  $("isi-pelanggan").innerHTML = list.length
    ? list.map(u => `<tr>
        <td>${u.id_user}</td>
        <td>${escapeHtml(u.nama)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${escapeHtml(u.no_hp || "-")}</td>
        <td>${orders.filter(o => o.id_user === u.id_user).length}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-outline btn-sm" data-aksi="detail" data-id="${u.id_user}">Detail</button>
          <button class="btn btn-danger btn-sm" data-aksi="hapus" data-id="${u.id_user}">Hapus</button>
        </td></tr>`).join("")
    : '<tr><td colspan="6" class="empty">Data pelanggan tidak ditemukan.</td></tr>';
}

function initPelanggan() {
  if (!requireRole("admin")) return;
  renderPelanggan();
  $("cari").addEventListener("input", renderPelanggan);
  $("btn-tutup-detail").addEventListener("click", () => tutupModal("modal-pelanggan"));

  $("isi-pelanggan").addEventListener("click", e => {
    const t = e.target.closest("button[data-aksi]");
    if (!t) return;
    const id = Number(t.dataset.id);
    const u = DB.get("users").find(x => x.id_user === id);
    if (!u) return;
    const pesanan = DB.get("orders").filter(o => o.id_user === id);

    if (t.dataset.aksi === "detail") {
      const belanja = pesanan.flatMap(o => o.payments)
        .filter(p => p.status_bayar === "Lunas").reduce((j, p) => j + p.jumlah_bayar, 0);
      $("isi-detail-pelanggan").innerHTML = `
        <p><strong>Nama:</strong> ${escapeHtml(u.nama)}</p>
        <p><strong>Username:</strong> ${escapeHtml(u.username)}</p>
        <p><strong>Email:</strong> ${escapeHtml(u.email)}</p>
        <p><strong>No. HP:</strong> ${escapeHtml(u.no_hp || "-")}</p>
        <p><strong>Alamat:</strong> ${escapeHtml(u.alamat || "-")}</p>
        <p><strong>Jumlah pesanan:</strong> ${pesanan.length}</p>
        <p><strong>Total pembayaran lunas:</strong> ${rupiah(belanja)}</p>`;
      bukaModal("modal-pelanggan");
    }
    if (t.dataset.aksi === "hapus") {
      if (pesanan.length) return toast("Tidak bisa dihapus: pelanggan masih punya pesanan.");
      konfirmasi(`Hapus pelanggan "${u.nama}"?`, () => {
        DB.set("users", DB.get("users").filter(x => x.id_user !== id));
        toast("Pelanggan dihapus.");
        renderPelanggan();
      });
    }
  });
}

/* ==========================================================
   PESANAN (daftar, detail, status, pembayaran, hapus)
   ========================================================== */
let idDetail = null;

function renderPesanan() {
  const kata = $("cari").value.trim().toLowerCase();
  const filter = $("filter-status").value;
  const list = DB.get("orders")
    .filter(o => (!filter || o.status_order === filter) &&
      (o.kode_order + " " + namaUser(o.id_user)).toLowerCase().includes(kata))
    .sort((a, b) => b.id_order - a.id_order);

  $("isi-pesanan").innerHTML = list.length
    ? list.map(o => {
        const b = statusBayarTerakhir(o);
        return `<tr>
          <td>${escapeHtml(o.kode_order)}</td>
          <td>${escapeHtml(namaUser(o.id_user))}</td>
          <td>${tanggalIndo(o.tanggal_order)}</td>
          <td>${escapeHtml(ringkasLayanan(o))}</td>
          <td>${rupiah(o.total_harga)}</td>
          <td>${badgeStatus(o.status_order)}</td>
          <td>${b ? badgeStatus(b) : "Belum bayar"}</td>
          <td><button class="btn btn-outline btn-sm" data-aksi="detail" data-id="${o.id_order}">Detail</button></td></tr>`;
      }).join("")
    : '<tr><td colspan="8" class="empty">Pesanan tidak ditemukan.</td></tr>';
}

/* Status yang boleh dipilih admin (hanya maju, atau batal) */
function opsiStatus(o) {
  const alur = STATUS_PESANAN.filter(s => s !== "Dibatalkan");
  if (["Dibatalkan", "Diambil/Dikirim"].includes(o.status_order)) return [o.status_order];
  const opsi = [o.status_order, ...alur.slice(alur.indexOf(o.status_order) + 1)];
  if (["Pending", "Dikonfirmasi"].includes(o.status_order)) opsi.push("Dibatalkan");
  return opsi;
}

function renderDetail() {
  const o = DB.get("orders").find(x => x.id_order === idDetail);
  if (!o) return tutupModal("modal-pesanan");
  const u = DB.get("users").find(x => x.id_user === o.id_user);
  const opsi = opsiStatus(o);

  const barisItem = o.details.map(d => `<tr>
      <td>${escapeHtml(d.nama_layanan)}</td><td>${escapeHtml(d.merek_sepatu)}</td>
      <td>${d.jumlah}</td><td>${rupiah(d.harga_satuan)}</td><td>${rupiah(d.subtotal)}</td></tr>`).join("");

  const barisBayar = o.payments.length
    ? o.payments.map(p => `<tr>
        <td>${escapeHtml(p.metode)}</td><td>${rupiah(p.jumlah_bayar)}</td>
        <td>${escapeHtml(p.referensi)}</td><td>${badgeStatus(p.status_bayar)}</td>
        <td>${p.status_bayar === "Menunggu Verifikasi"
          ? `<button class="btn btn-primary btn-sm" data-aksi="lunas" data-id="${p.id_payment}">Lunas</button>
             <button class="btn btn-danger btn-sm" data-aksi="tolak" data-id="${p.id_payment}">Tolak</button>` : "-"}</td></tr>`).join("")
    : '<tr><td colspan="5" class="empty">Belum ada pembayaran.</td></tr>';

  $("isi-detail").innerHTML = `
    <p><strong>${escapeHtml(o.kode_order)}</strong> · ${tanggalIndo(o.tanggal_order)}</p>
    <p><strong>Pelanggan:</strong> ${escapeHtml(u ? u.nama : "(dihapus)")} (${escapeHtml(u ? u.no_hp || "-" : "-")})</p>
    <p><strong>Total:</strong> ${rupiah(o.total_harga)}</p>
    <h4 style="margin:14px 0 6px">Item Pesanan</h4>
    <div class="table-wrap"><table><thead><tr><th>Layanan</th><th>Sepatu</th><th>Jml</th><th>Harga</th><th>Subtotal</th></tr></thead>
      <tbody>${barisItem}</tbody></table></div>
    <h4 style="margin:14px 0 6px">Pembayaran</h4>
    <div class="table-wrap"><table><thead><tr><th>Metode</th><th>Jumlah</th><th>Referensi</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody>${barisBayar}</tbody></table></div>
    <h4 style="margin:14px 0 6px">Status Pengerjaan</h4>
    <div id="pesan-detail" class="alert"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <select id="pilih-status" style="max-width:260px">
        ${opsi.map(s => `<option ${s === o.status_order ? "selected" : ""}>${s}</option>`).join("")}</select>
      <button class="btn btn-primary btn-sm" data-aksi="simpan-status" ${opsi.length === 1 ? "disabled" : ""}>Simpan Status</button>
    </div>
    <h4 style="margin:14px 0 6px">Catatan Pesanan</h4>
    <textarea id="edit-catatan" rows="2">${escapeHtml(o.catatan)}</textarea>
    <div style="margin-top:8px"><button class="btn btn-outline btn-sm" data-aksi="simpan-catatan">Simpan Catatan</button></div>
    <div class="modal-actions">
      <button class="btn btn-danger btn-sm" data-aksi="hapus-pesanan">Hapus Pesanan</button>
      <button class="btn btn-dark btn-sm" data-aksi="tutup">Tutup</button>
    </div>`;
}

function ubahPembayaran(idPayment, statusBaru) {
  const orders = DB.get("orders");
  const o = orders.find(x => x.id_order === idDetail);
  const p = o && o.payments.find(x => x.id_payment === idPayment);
  if (!p || p.status_bayar !== "Menunggu Verifikasi") return;
  p.status_bayar = statusBaru;
  DB.set("orders", orders);
  toast("Status pembayaran: " + statusBaru);
  renderDetail();
  renderPesanan();
}

function initPesanan() {
  if (!requireRole("admin")) return;
  $("filter-status").innerHTML = '<option value="">Semua status</option>' +
    STATUS_PESANAN.map(s => `<option>${s}</option>`).join("");
  renderPesanan();
  $("cari").addEventListener("input", renderPesanan);
  $("filter-status").addEventListener("change", renderPesanan);

  $("isi-pesanan").addEventListener("click", e => {
    const t = e.target.closest("button[data-aksi='detail']");
    if (!t) return;
    idDetail = Number(t.dataset.id);
    renderDetail();
    bukaModal("modal-pesanan");
  });

  $("isi-detail").addEventListener("click", e => {
    const t = e.target.closest("button[data-aksi]");
    if (!t) return;
    const aksi = t.dataset.aksi;

    if (aksi === "tutup") return tutupModal("modal-pesanan");
    if (aksi === "lunas") return ubahPembayaran(Number(t.dataset.id), "Lunas");
    if (aksi === "tolak") return ubahPembayaran(Number(t.dataset.id), "Ditolak");

    if (aksi === "simpan-status") {
      const baru = $("pilih-status").value;
      const orders = DB.get("orders");
      const o = orders.find(x => x.id_order === idDetail);
      if (baru === o.status_order) return;
      if (baru === "Diambil/Dikirim" && !sudahLunas(o)) {
        return pesanForm("pesan-detail", "Pembayaran harus Lunas sebelum status Diambil/Dikirim.", "error");
      }
      o.status_order = baru;
      DB.set("orders", orders);
      toast("Status pesanan diubah menjadi " + baru);
      renderDetail();
      renderPesanan();
    }

    if (aksi === "simpan-catatan") {
      const orders = DB.get("orders");
      orders.find(x => x.id_order === idDetail).catatan = $("edit-catatan").value.trim();
      DB.set("orders", orders);
      toast("Catatan disimpan.");
    }

    if (aksi === "hapus-pesanan") {
      konfirmasi("Hapus pesanan ini secara permanen?", () => {
        DB.set("orders", DB.get("orders").filter(x => x.id_order !== idDetail));
        tutupModal("modal-pesanan");
        toast("Pesanan dihapus.");
        renderPesanan();
      });
    }
  });
}

/* ---------- Pilih fungsi sesuai halaman ---------- */
if ($("stat-pelanggan")) initDashboard();
if ($("form-layanan")) initLayanan();
if ($("isi-pelanggan")) initPelanggan();
if ($("isi-pesanan")) initPesanan();