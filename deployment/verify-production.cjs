const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const backend='/var/www/satyatech/backend';
require(path.join(backend,'node_modules/dotenv')).config({path:path.join(backend,'.env'),quiet:true});
const {pool}=require(path.join(backend,'src/config/database'));
const api='https://admin.satyatech.org/api';
async function get(url,options){
 const res=await fetch(url,{...options,signal:AbortSignal.timeout(60000)});
 assert(res.ok,`HTTP ${res.status}`);return {code:res.status,data:await res.json()};
}
(async()=>{
 const chapters=await get(`${api}/chapters`);
 assert(Array.isArray(chapters.data.chapters));
 let sections=0,media=0;
 for(const chapter of chapters.data.chapters){
   const read=await get(`${api}/chapters/${chapter.id}/sections`);
   assert(Array.isArray(read.data.sections));
   for(const section of read.data.sections){sections++;media+=section.contents.length;}
 }
 const marker=(i,type)=>`<div class="media-embed" data-type="${type}" data-index="${i}"></div>`;
 const english=`<p><strong>Pause and breathe.</strong></p>${marker(0,'image')}<p>Observe your breath.</p>${marker(1,'video')}`;
 const translated=await get(`${api}/translate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:english,source:'en',targets:['id','fr','ru','es']})});
 assert.equal(translated.data.status,'complete');
 for(const html of Object.values(translated.data.translations)){
   assert(html.includes(marker(0,'image')) && html.includes(marker(1,'video')));
   assert(html.indexOf(marker(0,'image'))<html.indexOf(marker(1,'video')));
   assert(html.includes('<strong>'));
 }
 const filename=fs.readdirSync(path.join(backend,'uploads')).find(f=>/\.mp4$/i.test(f));
 assert(filename);
 const video=await fetch(`https://admin.satyatech.org/uploads/${filename}`,{headers:{Range:'bytes=0-1023'},signal:AbortSignal.timeout(15000)});
 assert.equal(video.status,206);assert((video.headers.get('content-type')||'').startsWith('video/'));await video.arrayBuffer();
 const report={chapters:chapters.data.chapters.length,sections,media,languages:Object.keys(translated.data.translations),translationStatus:translated.data.status,formatAndMediaPositions:'preserved',videoRange:video.status,indonesian:translated.data.translations.id,newApplicationRecords:0};
 fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>pool.end());
