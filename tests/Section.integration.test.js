const test = require('node:test');
const assert = require('node:assert/strict');
const enabled = process.env.RUN_DB_TESTS === '1';

test('real PostgreSQL: HTTP save/read, validation, metadata and rollback', {skip:!enabled}, async t => {
  assert.match(process.env.DB_NAME || '', /_test$/, 'Use a dedicated test database');
  const {pool} = require('../src/config/database');
  const express = require('express');
  const app = express(); app.use(express.json());
  app.use('/api/chapters',require('../src/routes/chapterRoutes'));
  let server;
  const schema = `chapter_check_${process.pid}`;
  // All new database connections use only this disposable test schema.
  await pool.query(`CREATE SCHEMA ${schema}`);
  await pool.end();
  const {Pool} = require('pg');
  const isolated = new Pool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USER,database:process.env.DB_NAME,options:`-c search_path=${schema}`});
  // Models already hold the pool object, so route its methods to the isolated pool.
  pool.query = isolated.query.bind(isolated); pool.connect = isolated.connect.bind(isolated);
  try {
    await pool.query(`CREATE TABLE chapters (id SERIAL PRIMARY KEY, chapter_order INTEGER, title JSONB, description JSONB, status TEXT, thumbnail TEXT);
      CREATE TABLE sections (id SERIAL PRIMARY KEY, chapter_id INTEGER REFERENCES chapters(id), section_order INTEGER, title JSONB, description JSONB, content JSONB, type TEXT, status TEXT);
      CREATE TABLE section_contents (id SERIAL PRIMARY KEY, section_id INTEGER REFERENCES sections(id), content_order INTEGER, title VARCHAR(255), type TEXT, is_required BOOLEAN, url TEXT, duration TEXT, instructions TEXT);
      INSERT INTO chapters(title,description) VALUES ('{"en":"Example"}', '{"en":""}');`);
    server = app.listen(0,'127.0.0.1'); await new Promise(r=>server.once('listening',r));
    const base = `http://127.0.0.1:${server.address().port}/api/chapters/1/sections`;
    const mark = (i,type)=>`<div class="media-embed" data-type="${type}" data-index="${i}"></div>`;
    const payload = {title:{en:'Mindful breathing',id:'Pernapasan sadar'}, content:{en:`<p>Pause and breathe.</p>${mark(0,'image')}<p>Observe your breath.</p>${mark(1,'video')}`,id:`<p>Berhenti sejenak dan bernapas.</p>${mark(0,'image')}<p>Amati napas Anda.</p>${mark(1,'video')}`}, contents:[{title:'Sunrise',type:'image',url:'/uploads/example-sunrise.jpg'},{title:'Breathing',type:'video',url:'/uploads/example-breathing.mp4',duration:'5 Minutes',instructions:'Breathe slowly.'}]};
    const translatedExample = require('../examples/translation-success.json');
    payload.content = { en: translatedExample.input, id: translatedExample.output };
    let saved;
    await t.test('saves and reopens bilingual text/image/text/video through HTTP',async()=>{
      const res = await fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      assert.equal(res.status,201); saved=(await res.json()).section;
      const read=await (await fetch(base)).json();
      assert.deepEqual(read.sections[0].content,payload.content);
      assert.equal(read.sections[0].contents[1].duration,'5 Minutes');
      assert.equal(read.sections[0].contents[1].instructions,'Breathe slowly.');
    });
    await t.test('rejects mismatched language layout without changing existing data',async()=>{
      const res=await fetch(`${base}/${saved.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,content:{...payload.content,id:'<p>Missing media</p>'}})});
      assert.equal(res.status,400);
      assert.deepEqual((await (await fetch(base)).json()).sections[0].content,payload.content);
    });
    await t.test('failed media INSERT rolls back both text and deleted attachments',async()=>{
      const originalError=console.error; console.error=()=>{};
      let res;
      try {res=await fetch(`${base}/${saved.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,title:{en:'Must roll back'},contents:[{...payload.contents[0],title:'x'.repeat(256)},payload.contents[1]]})});}
      finally {console.error=originalError;}
      assert.equal(res.status,500);
      const read=(await (await fetch(base)).json()).sections[0];
      assert.deepEqual(read.title,payload.title); assert.deepEqual(read.content,payload.content);
      assert.equal(read.contents.length,2); assert.equal(read.contents[0].id,saved.contents[0].id);
    });
    await t.test('chapter create/update includes sections in the same transaction',async()=>{
      const root=base.replace('/1/sections','');
      const chapterPayload={title:{en:'Atomic chapter'},description:{en:'Example'},status:'Drafted',sections:[payload]};
      const created=await fetch(root,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(chapterPayload)});
      assert.equal(created.status,201);
      const chapter=(await created.json()).chapter;
      const sections=(await (await fetch(`${root}/${chapter.id}/sections`)).json()).sections;
      assert.equal(sections.length,1);
      const broken={...chapterPayload,title:{en:'Must roll back chapter'},sections:[{...payload,id:sections[0].id,contents:[{...payload.contents[0],title:'x'.repeat(256)},payload.contents[1]]}]};
      const originalError=console.error; console.error=()=>{};
      let failed;
      try {failed=await fetch(`${root}/${chapter.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(broken)});}
      finally {console.error=originalError;}
      assert.equal(failed.status,500);
      const reopened=(await (await fetch(`${root}/${chapter.id}`)).json()).chapter;
      assert.deepEqual(reopened.title,chapterPayload.title);
      const unchanged=(await (await fetch(`${root}/${chapter.id}/sections`)).json()).sections;
      assert.equal(unchanged[0].contents[0].id,sections[0].contents[0].id);
      const before=(await pool.query('SELECT count(*)::int AS n FROM chapters')).rows[0].n;
      console.error=()=>{};
      try {failed=await fetch(root,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...chapterPayload,sections:[{...payload,content:{en:'<div class="media-embed" data-type="image" data-index="8"></div>'}}]})});}
      finally {console.error=originalError;}
      assert.equal(failed.status,400);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM chapters')).rows[0].n,before);
    });
    await t.test('writes a reviewable example from the actual database read response',async()=>{
      const fs=require('node:fs');
      const read=await (await fetch(base)).json();
      fs.writeFileSync('examples/chapter-success.json',JSON.stringify({note:'Saved and read back through local HTTP API using real, isolated PostgreSQL. Media URLs are illustrative fixtures.',...read},null,2)+'\n');
    });
  } finally {
    if(server) await new Promise(r=>server.close(r));
    await isolated.query(`DROP SCHEMA ${schema} CASCADE`); await isolated.end();
  }
});
