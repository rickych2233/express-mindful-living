const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mindful_living',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

pool.query("DELETE FROM roles WHERE name != 'Super Admin'", (err, res) => {
  if (err) console.error(err);
  else console.log("Deleted " + res.rowCount + " roles.");
  pool.end();
});
