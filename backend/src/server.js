require("dotenv").config();

const app = require("./app");
const { pool } = require("./db");

async function start() {
  const connection = await pool.getConnection();
  connection.release();

  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log("ROALSHOES API berjalan di http://localhost:" + port + "/api");
  });
}

start().catch(error => {
  console.error("Backend gagal dijalankan:", error.message);
  process.exitCode = 1;
});
