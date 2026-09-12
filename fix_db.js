const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mindful_living',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function flattenEn(obj) {
  if (obj && typeof obj === 'object' && obj.en) {
    if (typeof obj.en === 'string') return obj;
    if (typeof obj.en === 'object' && obj.en.en) {
       // dive deeper
       let curr = obj;
       while(curr && curr.en && typeof curr.en === 'object') {
           curr = curr.en;
       }
       return { en: curr.en || "" };
    }
  }
  return obj;
}

async function fixTable(tableName, columns) {
  console.log(`Fixing ${tableName}...`);
  const res = await pool.query(`SELECT * FROM ${tableName}`);
  for (const row of res.rows) {
    let updates = [];
    let values = [];
    let i = 1;
    let needsUpdate = false;
    for (const col of columns) {
      if (row[col]) {
        let original;
        try {
          original = typeof row[col] === 'string' ? JSON.parse(row[col]) : row[col];
        } catch(e) {
          original = { en: row[col] };
        }
        
        let flattened = await flattenEn(original);
        if (JSON.stringify(original) !== JSON.stringify(flattened)) {
           updates.push(`${col} = $${i++}`);
           values.push(flattened);
           needsUpdate = true;
        }
      }
    }
    if (needsUpdate) {
      values.push(row.id);
      await pool.query(`UPDATE ${tableName} SET ${updates.join(', ')} WHERE id = $${i}`, values);
    }
  }
}

async function run() {
  await fixTable('chapters', ['title', 'description']);
  await fixTable('sections', ['title', 'description', 'content']);
  await fixTable('media_files', ['short_quote', 'why_it_matters', 'corpus_connection', 'critical_note', 'integration_question']);
  console.log('Done fixing db.');
  pool.end();
}

run();
