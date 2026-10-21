const path = require('node:path');
const backend = process.argv[2];
const staged = process.argv[3];
require(path.join(backend, 'node_modules/dotenv')).config({path:path.join(backend,'.env'),quiet:true});
const {pool} = require(path.join(backend,'src/config/database'));
const {validateSectionContent} = require(path.join(staged,'src/utils/sectionContent'));
(async()=>{
  const columns=await pool.query("SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema=current_schema() AND table_name = ANY($1) ORDER BY table_name,column_name",[['sections','section_contents']]);
  const counts=await pool.query('SELECT (SELECT count(*) FROM chapters)::int AS chapters,(SELECT count(*) FROM sections)::int AS sections,(SELECT count(*) FROM section_contents)::int AS media');
  const sections=await pool.query('SELECT s.id,s.content,COALESCE((SELECT json_agg(sc ORDER BY sc.content_order) FROM section_contents sc WHERE sc.section_id=s.id),\'[]\') AS contents FROM sections s ORDER BY s.id');
  const invalid=[];
  for(const row of sections.rows){
    let content=row.content;
    if(typeof content==='string') {try{content=JSON.parse(content)}catch{content={en:content}}}
    try {validateSectionContent(content,row.contents)}catch(e){invalid.push({id:row.id,error:e.message})}
  }
  console.log(JSON.stringify({counts:counts.rows[0],columns:columns.rows,invalidSections:invalid},null,2));
  if(invalid.length) process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>pool.end());
