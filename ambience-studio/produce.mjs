import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { renderMusic } from './music-engine.mjs';
import { renderRain } from './rain-engine.mjs';

const DATA = process.env.SHORTSAI_DATA_ROOT || 'D:/ShortsAI_DATA';
const LIB = path.join(DATA, 'ambience-library', 'rain');
const OUT = path.join(DATA, 'ambience-studio', 'output');
const kind = process.argv[2] || 'rain';
const seconds = Number(process.argv[3] || 60);
if (!['rain','music'].includes(kind)) throw new Error('Use rain or music');
if (!Number.isInteger(seconds) || seconds < 10 || seconds > 36000) throw new Error('Duration must be 10..36000 seconds');
fs.mkdirSync(OUT, {recursive:true});
const output = path.join(OUT, kind + '-' + seconds + 's.wav');
function run(args) {
  const r = spawnSync('ffmpeg', ['-hide_banner','-nostdin','-y',...args], {stdio:'inherit',shell:false});
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error('FFmpeg failed: ' + r.status);
}
let engineDetails=null;
if (kind === 'rain') {
  engineDetails=renderRain({seconds,output,library:LIB});
} else {
  renderMusic({seconds,output});
}
if (!fs.existsSync(output) || fs.statSync(output).size < 10000) throw new Error('Output missing or too small');
const report={kind,seconds,output,createdAt:new Date().toISOString(),status:'technical-preview',musicEngine:kind==='music'?'original-melodic-synth-v1':null,rainEngine:kind==='rain'?'layered-rain-v3-preview':null,engineDetails,uploadAllowed:false,licenseReviewRequired:kind==='rain'};
fs.writeFileSync(output+'.json',JSON.stringify(report,null,2));
console.log('[AMBIENCE STUDIO] Preview ready:',output);
