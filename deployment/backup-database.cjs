const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const backend=process.argv[2], destination=process.argv[3];
require(path.join(backend,'node_modules/dotenv')).config({path:path.join(backend,'.env'),quiet:true});
const fd=fs.openSync(destination,'wx',0o600);
try {
  const result=spawnSync('pg_dump',['--format=custom','--host',process.env.DB_HOST||'127.0.0.1','--port',process.env.DB_PORT||'5432','--username',process.env.DB_USER||'postgres','--dbname',process.env.DB_NAME||'mindful_living'],{env:{...process.env,PGPASSWORD:process.env.DB_PASSWORD||''},stdio:['ignore',fd,'inherit']});
  if(result.error) throw result.error;
  if(result.status!==0) throw new Error('Database backup failed');
} finally {fs.closeSync(fd)}
console.log('Database backup created.');
