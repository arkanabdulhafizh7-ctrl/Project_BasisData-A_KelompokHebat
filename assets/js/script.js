/* ==========================================================
   ROALSHOES - script.js
   Fungsi bersama: sesi, proteksi role, navbar, sidebar,
   format, toast, modal konfirmasi.
   Membutuhkan config/data.js (dimuat lebih dulu).
   ========================================================== */

const BASE = document.body.dataset.base || "";

/* ---------- Format ---------- */
function rupiah(angka) {
  return "Rp" + Number(angka || 0).toLocaleString("id-ID");
}
function tanggalIndo(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function hariIni() {
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function escapeHtml(teks) {
  const el = document.createElement("div");
  el.textContent = teks == null ? "" : String(teks);
  return el.innerHTML;
}
function badgeStatus(status) {
  let kelas = "badge-proses";
  if (["Pending", "Menunggu Verifikasi", "Menunggu Sepatu"].includes(status)) kelas = "badge-pending";
  if (["Selesai", "Diambil/Dikirim", "Lunas"].includes(status)) kelas = "badge-selesai";
  if (["Dibatalkan", "Ditolak"].includes(status)) kelas = "badge-batal";
  return `<span class="badge ${kelas}">${escapeHtml(status)}</span>`;
}

/* ---------- Sesi (sessionStorage) ---------- */
function getSession() {
  try { return JSON.parse(sessionStorage.getItem(RS_KEYS.session)); }
  catch (e) { return null; }
}
function setSession(user) {
  sessionStorage.setItem(RS_KEYS.session, JSON.stringify({
    id_user: user.id_user, nama: user.nama, role: user.role
  }));
}
function logout() {
  sessionStorage.removeItem(RS_KEYS.session);
  window.location.href = BASE + "index.html";
}
function currentUser() {
  const s = getSession();
  if (!s) return null;
  return DB.get("users").find(u => u.id_user === s.id_user) || null;
}

/* Proteksi halaman: panggil requireRole("pelanggan") atau ("admin") */
function requireRole(role) {
  const s = getSession();
  if (!s) { window.location.href = BASE + "login.html"; return false; }
  if (s.role !== role) {
    alert("Anda tidak memiliki akses ke halaman ini.");
    window.location.href = BASE + (s.role === "admin" ? "admin/dashboard.html" : "customer/pemesanan.html");
    return false;
  }
  return true;
}

/* ---------- Navbar & Footer ---------- */
function renderNavbar() {
  const el = document.getElementById("navbar");
  if (!el) return;
  const s = getSession();
  const halaman = location.pathname.split("/").pop();
  const link = (href, teks) =>
    `<li><a href="${BASE}${href}" class="${href.endsWith(halaman) ? "active" : ""}">${teks}</a></li>`;
  let menu = "";
  if (!s) {
    menu = link("index.html", "Beranda") + link("index.html#layanan", "Layanan") +
           link("index.html#cara-pesan", "Cara Pesan") + link("login.html", "Masuk") +
           `<li><a class="btn btn-primary btn-sm" href="${BASE}register.html">Daftar</a></li>`;
  } else if (s.role === "pelanggan") {
    menu = link("index.html", "Beranda") + link("customer/pemesanan.html", "Pesan") +
           link("customer/status-pesanan.html", "Status") + link("customer/riwayat.html", "Riwayat") +
           link("customer/profil.html", "Profil") +
           `<li><a href="#" id="btn-logout" class="btn btn-outline btn-sm">Keluar</a></li>`;
  } else {
    menu = link("index.html", "Beranda") + link("admin/dashboard.html", "Dashboard Admin") +
           `<li><a href="#" id="btn-logout" class="btn btn-outline btn-sm">Keluar</a></li>`;
  }
  el.className = "navbar";
  el.innerHTML = `<div class="container">
    <a class="logo" href="${BASE}index.html">ROAL<span>SHOES</span></a>
    <button class="nav-toggle" id="nav-toggle" aria-label="Menu">☰</button>
    <ul class="nav-links" id="nav-links">${menu}</ul></div>`;
  document.getElementById("nav-toggle").onclick = () =>
    document.getElementById("nav-links").classList.toggle("open");
  const out = document.getElementById("btn-logout");
  if (out) out.onclick = e => { e.preventDefault(); logout(); };
}

function renderFooter() {
  const el = document.getElementById("footer");
  if (!el) return;
  el.className = "footer";
  el.innerHTML = `<div class="container"><strong style="color:#fff">ROAL<span class="accent">SHOES</span></strong>
    <p>Jasa Cuci &amp; Rawat Sepatu</p>
    <p style="margin-top:8px"><strong style="color:#fff">Kelompok Hebat</strong></p>
    <p style="font-size:.82rem;line-height:1.8">
      Muhammad Alfarel Prihadi (4525210083) · Farid Zhahir Muttaqin (4525210105) ·
      Muhammad Syamil (4525210130) · Arkan Abdul Hafizh (4525210137) ·
      Aqsa Ibnu Rizik (4525210103) · Muhammad Faathir Madani (4525210100) ·
      M. Akbar Raffael Ridho (4525210085)</p>
    <p style="margin-top:8px">&copy; ${new Date().getFullYear()} Roalshoes</p></div>`;
}

/* ---------- Sidebar admin ---------- */
function renderSidebar() {
  const el = document.getElementById("sidebar");
  if (!el) return;
  const halaman = location.pathname.split("/").pop();
  const item = (file, teks) =>
    `<a class="menu ${file === halaman ? "active" : ""}" href="${BASE}admin/${file}">${teks}</a>`;
  el.className = "sidebar";
  el.innerHTML = `<a class="logo" href="${BASE}index.html">ROAL<span>SHOES</span></a>
    ${item("dashboard.html", "📊 Dashboard")}
    ${item("layanan.html", "🧼 Layanan")}
    ${item("pelanggan.html", "👥 Pelanggan")}
    ${item("pesanan.html", "📦 Pesanan")}
    <a class="menu" href="#" id="btn-logout">🚪 Keluar</a>`;
  document.getElementById("btn-logout").onclick = e => { e.preventDefault(); logout(); };
}

/* ---------- Toast & Modal ---------- */
function toast(pesan) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = pesan;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function bukaModal(id) { document.getElementById(id).classList.add("show"); }
function tutupModal(id) { document.getElementById(id).classList.remove("show"); }

/* Modal konfirmasi dinamis: konfirmasi("Hapus?", () => {...}) */
function konfirmasi(pesan, onYa) {
  const bg = document.createElement("div");
  bg.className = "modal-bg show";
  bg.innerHTML = `<div class="modal"><h3>Konfirmasi</h3><p>${escapeHtml(pesan)}</p>
    <div class="modal-actions">
      <button class="btn btn-outline btn-sm" id="k-batal">Batal</button>
      <button class="btn btn-danger btn-sm" id="k-ya">Ya, lanjutkan</button></div></div>`;
  document.body.appendChild(bg);
  bg.querySelector("#k-batal").onclick = () => bg.remove();
  bg.querySelector("#k-ya").onclick = () => { bg.remove(); onYa(); };
}

document.addEventListener("DOMContentLoaded", () => {
  renderNavbar();
  renderFooter();
  renderSidebar();
});