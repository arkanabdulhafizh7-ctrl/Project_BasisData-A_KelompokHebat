/* ==========================================================
   ROALSHOES - auth.js
   Registrasi dan login (simulasi LocalStorage).
   PERINGATAN: password disimpan apa adanya hanya untuk
   simulasi kuliah. Jangan dipakai di produksi.
   ========================================================== */

function tampilPesan(id, teks, tipe) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = teks;
  el.className = "alert show alert-" + tipe;
}

/* ---------- LOGIN ---------- */
const formLogin = document.getElementById("form-login");
if (formLogin) {
  let roleDipilih = "pelanggan";

  // Jika sudah login, langsung arahkan
  const sesi = getSession();
  if (sesi) {
    location.href = sesi.role === "admin" ? "admin/dashboard.html" : "customer/pemesanan.html";
  }

  document.querySelectorAll(".tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      roleDipilih = btn.dataset.role;
    });
  });

  formLogin.addEventListener("submit", e => {
    e.preventDefault();
    const ident = document.getElementById("identitas").value.trim().toLowerCase();
    const pass = document.getElementById("password").value;

    if (!ident || !pass) {
      return tampilPesan("pesan", "Username/email dan password wajib diisi.", "error");
    }

    const user = DB.get("users").find(u =>
      (u.username.toLowerCase() === ident || u.email.toLowerCase() === ident) && u.password === pass
    );
    if (!user) return tampilPesan("pesan", "Username/email atau password salah.", "error");
    if (user.role !== roleDipilih) {
      return tampilPesan("pesan", `Akun ini bukan akun ${roleDipilih}. Pilih tab yang sesuai.`, "error");
    }

    setSession(user);
    location.href = user.role === "admin" ? "admin/dashboard.html" : "customer/pemesanan.html";
  });
}

/* ---------- REGISTRASI ---------- */
const formRegister = document.getElementById("form-register");
if (formRegister) {
  formRegister.addEventListener("submit", e => {
    e.preventDefault();
    const nama = document.getElementById("nama").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const hp = document.getElementById("no_hp").value.trim();
    const pass = document.getElementById("password").value;
    const konf = document.getElementById("konfirmasi").value;

    if (nama.length < 3) return tampilPesan("pesan", "Nama lengkap minimal 3 karakter.", "error");
    if (!/^\S+@\S+\.\S+$/.test(email)) return tampilPesan("pesan", "Format email tidak valid.", "error");
    if (!/^[0-9]{9,14}$/.test(hp)) return tampilPesan("pesan", "Nomor telepon harus 9-14 digit angka.", "error");
    if (pass.length < 6) return tampilPesan("pesan", "Password minimal 6 karakter.", "error");
    if (pass !== konf) return tampilPesan("pesan", "Konfirmasi password tidak cocok.", "error");

    const users = DB.get("users");
    if (users.some(u => u.email.toLowerCase() === email || u.username.toLowerCase() === email)) {
      return tampilPesan("pesan", "Email sudah terdaftar.", "error");
    }

    users.push({
      id_user: DB.nextId(users, "id_user"),
      nama, username: email, email, password: pass,
      no_hp: hp, alamat: "", role: "pelanggan"
    });
    DB.set("users", users);

    tampilPesan("pesan", "Registrasi berhasil! Mengarahkan ke halaman login...", "success");
    formRegister.reset();
    setTimeout(() => (location.href = "login.html"), 1400);
  });
}