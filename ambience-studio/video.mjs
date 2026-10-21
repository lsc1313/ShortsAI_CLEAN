import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {acquireVisual} from '../ambience-test/source.mjs';

const DATA=process.env.SHORTSAI_DATA_ROOT||'D:/ShortsAI_DATA';
const ROOT=path.join(DATA,'ambience-studio');
const kind=process.argv[2]||'rain';
const seconds=Number(process.argv[3]||60);
if(!['rain','music'].includes(kind)||!Number.isInteger(seconds)||seconds<10||seconds>36000)
  throw new Error('Usage: node ambience-studio/video.mjs rain|music 60');
const audio=path.join(ROOT,'output',kind+'-'+seconds+'s.wav');
if(!fs.existsSync(audio))throw new Error('Audio missing. Run produce.mjs first: '+audio);
const outDir=path.join(ROOT,'video');
fs.mkdirSync(outDir,{recursive:true});
const out=path.join(outDir,kind+'-'+seconds+'s.mp4');
const query=kind==='rain'?'rainy night city apartment window':'peaceful sunrise lake mist nature calm piano music';
const cfg={theme:'current',themes:{current:{visualQuery:query}}};
let visual=null;
try{visual=await acquireVisual(cfg,path.join(ROOT,'visual-'+kind));}
catch(e){console.warn('[VIDEO] Visual sourcing failed:',e.message);}
if(!visual?.file||!fs.existsSync(visual.file)){
  throw new Error('No licensed visual available. MP4 not rendered; add PEXELS_API_KEY or PIXABAY_API_KEY and retry.');
}
const isVideo=visual.type==='video';
const inputArgs=isVideo?['-stream_loop','-1','-i',visual.file]:['-loop','1','-framerate','24','-i',visual.file];
const vf='scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fps=24,format=yuv420p';
const args=['-hide_banner','-nostdin','-y',...inputArgs,'-i',audio,
  '-map','0:v:0','-map','1:a:0','-vf',vf,'-t',String(seconds),
  '-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p',
  '-c:a','aac','-b:a','192k','-movflags','+faststart',out];
const result=spawnSync('ffmpeg',args,{stdio:'inherit',shell:false});
if(result.error)throw result.error;
if(result.status!==0)throw new Error('Video render failed: '+result.status);
if(!fs.existsSync(out)||fs.statSync(out).size<100000)throw new Error('Video output missing or too small');
const report={kind,seconds,video:out,audio,visualProvider:visual.provider,visualType:visual.type,sourceMetadata:path.join(ROOT,'visual-'+kind,'source','source.json'),status:'review-required',uploadAllowed:false,createdAt:new Date().toISOString()};
fs.writeFileSync(out+'.json',JSON.stringify(report,null,2));
console.log('[AMBIENCE] VIDEO READY:',out);
