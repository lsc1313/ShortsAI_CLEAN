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
const sceneCount=seconds>=600?4:seconds>=120?3:2;
const scenes=[];
for(let i=0;i<sceneCount;i++){
  const sceneRoot=path.join(ROOT,'visual-'+kind,'scene-'+i);
  try{
    const visual=await acquireVisual(cfg,sceneRoot);
    if(visual?.file&&fs.existsSync(visual.file)){
      const metadataPath=path.join(sceneRoot,'source','source.json');
      const metadata=fs.existsSync(metadataPath)?JSON.parse(fs.readFileSync(metadataPath,'utf8')):{};
      if(!scenes.some(s=>s.metadata.id&&s.metadata.id===metadata.id&&s.visual.provider===visual.provider))
        scenes.push({visual,metadata,metadataPath});
    }
  }catch(e){console.warn('[VIDEO] Scene acquisition failed:',e.message);}
}
if(!scenes.length)throw new Error('No visual source available; video not rendered.');
const temp=path.join(outDir,kind+'-'+seconds+'s-scenes');
fs.mkdirSync(temp,{recursive:true});
const segmentLength=30;
const segmentCount=Math.ceil(seconds/segmentLength);
const segments=[];
const vf='scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fps=24,format=yuv420p';
for(let i=0;i<segmentCount;i++){
  const scene=scenes[i%scenes.length];
  const file=path.join(temp,'part-'+String(i).padStart(4,'0')+'.mp4');
  const len=Math.min(segmentLength,seconds-i*segmentLength);
  const args=scene.visual.type==='video'
    ?['-stream_loop','-1','-i',scene.visual.file]
    :['-loop','1','-framerate','24','-i',scene.visual.file];
  const r=spawnSync('ffmpeg',['-hide_banner','-nostdin','-y',...args,
    '-map','0:v:0','-an','-vf',vf,'-t',String(len),'-c:v','libx264',
    '-preset','veryfast','-crf','23','-pix_fmt','yuv420p',file],{stdio:'inherit',shell:false});
  if(r.error)throw r.error;
  if(r.status!==0)throw new Error('Scene '+i+' render failed: '+r.status);
  segments.push(file);
}
const concatFile=path.join(temp,'concat.txt');
fs.writeFileSync(concatFile,segments.map(f=>"file '"+f.replace(/'/g,"'\\''").replace(/\\/g,'/')+"'").join('\n'));
const silent=path.join(temp,'silent.mp4');
let r=spawnSync('ffmpeg',['-hide_banner','-nostdin','-y','-f','concat','-safe','0','-i',concatFile,
  '-c','copy',silent],{stdio:'inherit',shell:false});
if(r.error)throw r.error;
if(r.status!==0)throw new Error('Scene concatenation failed: '+r.status);
r=spawnSync('ffmpeg',['-hide_banner','-nostdin','-y','-i',silent,'-i',audio,
  '-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k',
  '-t',String(seconds),'-movflags','+faststart',out],{stdio:'inherit',shell:false});
if(r.error)throw r.error;
if(r.status!==0)throw new Error('Video/audio mux failed: '+r.status);
if(!fs.existsSync(out)||fs.statSync(out).size<100000)throw new Error('Video output missing or too small');
const report={kind,seconds,video:out,audio,visualProviders:scenes.map(s=>s.visual.provider),sceneCount:scenes.length,sceneDurationSeconds:segmentLength,sourceMetadata:scenes.map(s=>s.metadataPath),status:'review-required',uploadAllowed:false,createdAt:new Date().toISOString()};
fs.writeFileSync(out+'.json',JSON.stringify(report,null,2));
console.log('[AMBIENCE] VIDEO READY:',out);
