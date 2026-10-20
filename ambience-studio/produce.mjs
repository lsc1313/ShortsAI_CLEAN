import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { renderMusic } from './music-engine.mjs';

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
if (kind === 'rain') {
  const manifestFile = path.join(LIB,'manifest.json');
  if (!fs.existsSync(manifestFile)) throw new Error('Rain manifest missing: ' + manifestFile);
  const manifest = JSON.parse(fs.readFileSync(manifestFile,'utf8'));
  const candidates = (manifest.sounds || []).map(s => {
    const id = String(s.id || '');
    const file = fs.readdirSync(LIB).find(n => n.startsWith(id + '.') && /\.(mp3|ogg|wav|flac|m4a)$/i.test(n));
    return file ? {file:path.join(LIB,file),name:s.name||'',id} : null;
  }).filter(Boolean);
  if (candidates.length < 2) throw new Error('Need at least two available licensed rain sources');
  const a = candidates.find(s => !/thunder|storm/i.test(s.name)) || candidates[0];
  const b = candidates.find(s => s.id !== a.id && !/thunder/i.test(s.name)) || candidates.find(s=>s.id!==a.id);
  const fade = Math.min(3, seconds/8);
  run(['-stream_loop','-1','-i',a.file,'-stream_loop','-1','-i',b.file,
    '-filter_complex',
    '[0:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=0.55[a];'+
    '[1:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=0.23[b];'+
    '[a][b]amix=inputs=2:duration=longest:normalize=0,highpass=f=45,lowpass=f=14000,alimiter=limit=0.88,afade=t=in:st=0:d='+fade+',afade=t=out:st='+(seconds-fade)+':d='+fade+'[out]',
    '-map','[out]','-t',String(seconds),'-ar','48000','-ac','2','-c:a','pcm_s16le',output]);
} else {
  renderMusic({seconds,output});
}
if (!fs.existsSync(output) || fs.statSync(output).size < 10000) throw new Error('Output missing or too small');
const report={kind,seconds,output,createdAt:new Date().toISOString(),status:'technical-preview',musicEngine:kind==='music'?'original-melodic-synth-v1':null,uploadAllowed:false,licenseReviewRequired:kind==='rain'};
fs.writeFileSync(output+'.json',JSON.stringify(report,null,2));
console.log('[AMBIENCE STUDIO] Preview ready:',output);
