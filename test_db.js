const { Pool } = require("pg");
const pool = new Pool({
  host: "127.0.0.1",
  port: 5432,
  user: "postgres",
  password: "",
  database: "mindful_living",
});

async function run() {
  try {
    const res = await pool.query("SELECT id, name, is_system FROM roles");
    console.table(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
