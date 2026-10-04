import fs from "fs";
import path from "path";
import {spawn} from "child_process";

const ROOT="D:/ShortsAI_DATA/ambience-library/rain";
const OUTROOT="D:/ShortsAI_DATA/ambience-test/output";
const OUT=path.join(OUTROOT,"rain-v2-30min.m4a");
const DURATION=1800;
fs.mkdirSync(OUTROOT,{recursive:true});

const manifestPath=path.join(ROOT,"manifest.json");
if(!fs.existsSync(manifestPath)) throw new Error("Rain manifest not found. Run npm run ambience-rain-collect first.");
const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
const sounds=manifest.sounds||[];
if(sounds.length<3) throw new Error("Need at least 3 collected rain sounds.");

function locate(id){
  const names=fs.readdirSync(ROOT).filter(n=>n.startsWith(String(id)+".")&&!n.endsWith(".json"));
  if(!names.length) throw new Error("Audio file missing for "+id);
  return path.join(ROOT,names[0]);
}
function isThunder(s){return /thunder|storm|hail/i.test(String(s.name||""));}
const bed=sounds.find(s=>/continuous|light rain|open window/i.test(s.name)&&!isThunder(s))||sounds.find(s=>!isThunder(s))||sounds[0];
const texture=sounds.find(s=>s.id!==bed.id&&/window|inside/i.test(s.name))||sounds.find(s=>s.id!==bed.id&&!isThunder(s))||sounds[1];
const thunder=sounds.find(s=>s.id!==bed.id&&s.id!==texture.id&&isThunder(s))||sounds.find(s=>s.id!==bed.id&&s.id!==texture.id)||sounds[2];

console.log("[RAIN V2] BED:",bed.id,bed.name);
console.log("[RAIN V2] TEXTURE:",texture.id,texture.name);
console.log("[RAIN V2] THUNDER:",thunder.id,thunder.name);
console.log("[RAIN V2] TARGET: 30 minutes");

const inputs=[bed,texture,thunder].map(locate);
const args=[];
for(const file of inputs) args.push("-stream_loop","-1","-i",file);

// Continuous real recordings form the bed. Offsets/desync prevent aligned repeats;
// low thunder level keeps transients from dominating sleep ambience.
const filter=[
  "[0:a]atrim=0:1800,asetpts=N/SR/TB,volume=0.78[a0]",
  "[1:a]adelay=17000|17000,atrim=0:1800,asetpts=N/SR/TB,volume=0.30[a1]",
  "[2:a]adelay=53000|53000,atrim=0:1800,asetpts=N/SR/TB,volume=0.10[a2]",
  "[a0][a1][a2]amix=inputs=3:duration=longest:normalize=0,highpass=f=45,lowpass=f=15500,alimiter=limit=0.92,loudnorm=I=-24:LRA=8:TP=-2[a]"
].join(";");

args.push("-filter_complex",filter,"-map","[a]","-t",String(DURATION),"-c:a","aac","-b:a","256k","-ar","48000","-ac","2","-y",OUT);
console.log("[RAIN V2] MIXING...");
const child=spawn("ffmpeg",args,{stdio:["ignore","ignore","inherit"]});
child.on("error",e=>{console.error("[RAIN V2] FFmpeg start failed:",e.message);process.exitCode=1;});
child.on("close",code=>{
  if(code!==0){console.error("[RAIN V2] FAILED:",code);process.exitCode=code||1;return;}
  const size=fs.statSync(OUT).size;
  console.log("[RAIN V2] READY");
  console.log("[RAIN V2] FILE:",OUT);
  console.log("[RAIN V2] SIZE MB:",(size/1024/1024).toFixed(1));
});
