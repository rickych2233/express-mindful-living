const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@187.124.129.55:5432/mindful_living_db' });
pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'sections\'').then(res => { console.log(res.rows); process.exit(0); }).catch(err => { console.log(err); process.exit(1); });
