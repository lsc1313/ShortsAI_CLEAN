import {spawnSync} from 'node:child_process';
const kind=process.argv[2]||'rain',seconds=process.argv[3]||'60';
function run(script){
  const r=spawnSync(process.execPath,[decodeURIComponent(new URL(script,import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1')),kind,seconds],{stdio:'inherit',shell:false});
  if(r.error)throw r.error;
  if(r.status!==0)process.exit(r.status||1);
}
run('./produce.mjs');
run('./video.mjs');
