const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mindful_living',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});
async function test() {
  try {
    const res = await pool.query(`SELECT data_type FROM information_schema.columns WHERE table_name = 'chapters' AND column_name = 'title'`);
    console.log("title column type:", res.rows[0].data_type);
  } finally {
    pool.end();
  }
}
test();
