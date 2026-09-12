const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mindful_living',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sections'`, (err, res) => {
  if (err) console.error(err);
  else console.log(res.rows);
  pool.end();
});
