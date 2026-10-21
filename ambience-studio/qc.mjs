import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const file=process.argv[2];
if(!file||!fs.existsSync(file)) throw new Error('Usage: node ambience-studio/qc.mjs <audio-file>');
function exec(bin,args){
  const r=spawnSync(bin,args,{encoding:'utf8',maxBuffer:8*1024*1024});
  if(r.error)throw r.error;
  if(r.status!==0)throw new Error(bin+' failed: '+(r.stderr||'').slice(-1200));
  return (r.stdout||'')+'\n'+(r.stderr||'');
}
const probe=JSON.parse(exec('ffprobe',['-v','error','-show_entries','format=duration:stream=sample_rate,channels','-of','json',file]));
const duration=Number(probe.format?.duration);
if(!Number.isFinite(duration)||duration<10)throw new Error('Invalid audio duration');
function volume(start,len){
  const txt=exec('ffmpeg',['-hide_banner','-nostdin','-ss',String(start),'-t',String(len),'-i',file,'-af','volumedetect','-f','null','-']);
  const mean=txt.match(/mean_volume:\s*(-?[\d.]+) dB/);
  const peak=txt.match(/max_volume:\s*(-?[\d.]+) dB/);
  return {meanDb:mean?Number(mean[1]):null,peakDb:peak?Number(peak[1]):null};
}
const whole=volume(0,duration);
const intro=volume(0,Math.min(10,duration/4));
const middle=volume(Math.max(0,duration/2-5),Math.min(10,duration/4));
const difference=(intro.meanDb!==null&&middle.meanDb!==null)?Number((intro.meanDb-middle.meanDb).toFixed(1)):null;
const issues=[];
if(whole.peakDb===null||whole.meanDb===null)issues.push('Unable to measure audio volume');
if(whole.peakDb!==null&&whole.peakDb>=-0.5)issues.push('Peak too close to clipping');
if(difference!==null&&Math.abs(difference)>6)issues.push('Intro/middle mean level differs by >6 dB');
const report={file:path.resolve(file),durationSeconds:duration,sampleRate:probe.streams?.[0]?.sample_rate||null,channels:probe.streams?.[0]?.channels||null,whole,intro,middle,introMinusMiddleDb:difference,issues,technicalPass:issues.length===0,subjectiveListeningRequired:true,uploadAllowed:false,createdAt:new Date().toISOString()};
fs.writeFileSync(file+'.qc.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(issues.length)process.exitCode=2;
