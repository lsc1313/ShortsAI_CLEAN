import fs from 'node:fs';
import path from 'node:path';

// Deterministic original note sequence, rendered locally without external music assets.
// This is a synthesized prototype, not a sampled acoustic piano.
const SR=24000;
const progression=[
  [48,55,60,64,67], // C
  [45,52,57,60,64], // Am
  [41,48,53,57,60], // F
  [43,50,55,59,62]  // G
];
const motifs=[
  [72,null,76,79,null,76,74,null],
  [72,69,null,76,72,null,69,67],
  [69,null,72,76,null,72,69,null],
  [71,74,null,79,76,null,74,71]
];
const hz=n=>440*Math.pow(2,(n-69)/12);
const clamp=x=>Math.max(-1,Math.min(1,x));
function voice(t,frequency,duration,velocity) {
  if(t<0||t>duration) return 0;
  const attack=1-Math.exp(-t*38);
  const release=Math.min(1,Math.max(0,(duration-t)/0.24));
  const env=attack*Math.exp(-t*1.65)*release;
  const p=2*Math.PI*frequency*t;
  return velocity*env*(Math.sin(p)+0.24*Math.sin(2*p)+0.09*Math.sin(3*p));
}
export function renderMusic({seconds,output}) {
  fs.mkdirSync(path.dirname(output),{recursive:true});
  const beat=60/66,bar=beat*4,events=[];
  const bars=Math.ceil(seconds/bar);
  for(let b=0;b<bars;b++){
    const chord=progression[b%4],start=b*bar;
    for(let j=0;j<chord.length;j++) events.push({start:start+j*0.012,dur:bar*0.92,f:hz(chord[j]),vel:j===0?0.10:0.052});
    const melody=motifs[b%4];
    for(let j=0;j<melody.length;j++){
      if(melody[j]===null) continue;
      events.push({start:start+j*beat/2,dur:beat*(j%2===0?0.86:0.60),f:hz(melody[j]),vel:0.13});
    }
  }
  const total=Math.floor(seconds*SR);
  const fd=fs.openSync(output,'w');
  const header=Buffer.alloc(44);
  header.write('RIFF',0);header.writeUInt32LE(36+total*4,4);header.write('WAVEfmt ',8);
  header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);
  header.writeUInt32LE(SR,24);header.writeUInt32LE(SR*4,28);header.writeUInt16LE(4,32);
  header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(total*4,40);
  fs.writeSync(fd,header);
  const chunk=4096,delayL=new Float32Array(Math.floor(SR*0.29)),delayR=new Float32Array(Math.floor(SR*0.41));
  try {
    for(let offset=0;offset<total;offset+=chunk){
      const count=Math.min(chunk,total-offset),buf=Buffer.allocUnsafe(count*4);
      for(let i=0;i<count;i++){
        const idx=offset+i,t=idx/SR;
        let dry=0;
        for(const e of events) if(t>=e.start&&t<=e.start+e.dur) dry+=voice(t-e.start,e.f,e.dur,e.vel);
        const li=idx%delayL.length,ri=idx%delayR.length;
        const l=dry+delayL[li]*0.28,r=dry+delayR[ri]*0.28;
        delayL[li]=dry+delayL[li]*0.22;delayR[ri]=dry+delayR[ri]*0.20;
        const fade=Math.min(1,t/2,(seconds-t)/3);
        buf.writeInt16LE(Math.round(clamp(l*fade)*32760),i*4);
        buf.writeInt16LE(Math.round(clamp(r*fade)*32760),i*4+2);
      }
      fs.writeSync(fd,buf);
    }
  } finally {fs.closeSync(fd);}
}
