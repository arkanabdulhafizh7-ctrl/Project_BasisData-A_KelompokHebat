const jwt = require("jsonwebtoken");
const { pool } = require("../db");
const { HttpError } = require("../utils");

async function authenticate(req, res, next) {
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new HttpError(401, "Token autentikasi diperlukan.");

  let claims;
  try {
    claims = jwt.verify(match[1], process.env.JWT_SECRET);
  } catch (error) {
    throw new HttpError(401, "Token tidak valid atau sudah kedaluwarsa.");
  }

  const userId = Number(claims.sub);
  if (!Number.isSafeInteger(userId) || userId < 1) {
    throw new HttpError(401, "Token tidak valid.");
  }

  const [users] = await pool.execute(
    "SELECT id_user, nama, username, email, no_hp, alamat, role FROM users WHERE id_user = ?",
    [userId]
  );
  if (!users.length) throw new HttpError(401, "Akun tidak ditemukan.");
  req.user = users[0];
  next();
}

function authorize(...roles) {
  return function (req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new HttpError(403, "Anda tidak memiliki akses untuk melakukan tindakan ini.");
    }
    next();
  };
}

module.exports = { authenticate, authorize };
