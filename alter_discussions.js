require('dotenv').config();
const { pool } = require('./src/config/database');
pool.query("ALTER TABLE discussions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Visible';")
  .then(() => {
    console.log('Added status column');
    return pool.end();
  })
  .catch(e => console.error(e));
