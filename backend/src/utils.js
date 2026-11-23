class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parseId(value, label) {
  if (!/^[1-9]\d*$/.test(String(value))) {
    throw new HttpError(400, label + " tidak valid.");
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id)) throw new HttpError(400, label + " tidak valid.");
  return id;
}

function requiredText(value, label, minLength, maxLength) {
  if (typeof value !== "string") throw new HttpError(400, label + " wajib diisi.");
  const text = value.trim();
  if (text.length < minLength || text.length > maxLength) {
    throw new HttpError(400, label + " harus " + minLength + "-" + maxLength + " karakter.");
  }
  return text;
}

function optionalText(value, label, maxLength) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new HttpError(400, label + " tidak valid.");
  const text = value.trim();
  if (text.length > maxLength) throw new HttpError(400, label + " terlalu panjang.");
  return text;
}

function positiveInteger(value, label, minimum, maximum) {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) {
    throw new HttpError(400, label + " tidak valid.");
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new HttpError(400, label + " tidak valid.");
  }
  return number;
}

function validateService(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Data layanan tidak valid.");
  }

  const service = {
    nama_layanan: requiredText(body.nama_layanan, "Nama layanan", 3, 100),
    deskripsi: requiredText(body.deskripsi, "Deskripsi", 5, 5000),
    harga: positiveInteger(body.harga, "Harga", 1000, 2147483647),
    estimasi_hari: positiveInteger(body.estimasi_hari, "Estimasi hari", 1, 30),
    is_active: body.is_active === undefined ? 1 : Number(body.is_active)
  };
  if (![0, 1].includes(service.is_active)) {
    throw new HttpError(400, "Status layanan tidak valid.");
  }
  return service;
}

function publicUser(user) {
  return {
    id_user: user.id_user,
    nama: user.nama,
    username: user.username,
    email: user.email,
    no_hp: user.no_hp,
    alamat: user.alamat,
    role: user.role
  };
}

module.exports = {
  HttpError,
  parseId,
  requiredText,
  optionalText,
  positiveInteger,
  validateService,
  publicUser
};
