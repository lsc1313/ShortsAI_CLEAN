import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

// Rain V3 preview: retains the Rain V2 CC0 manifest, avoids thunder for sleep use,
// starts all layers immediately and adds gentle, slow gain movement.
export function renderRain({seconds,output,library}) {
  const manifestFile=path.join(library,'manifest.json');
  if(!fs.existsSync(manifestFile)) throw new Error('Rain manifest missing: '+manifestFile);
  const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
  const names=fs.readdirSync(library);
  const sources=(manifest.sounds||[]).filter(s=>s && s.id!=null && /creativecommons\.org\/publicdomain\/zero\/1\.0|^cc0$/i.test(String(s.license||''))).map(s=>{
    const id=String(s.id);
    const file=names.find(n=>n.startsWith(id+'.') && /\.(mp3|ogg|wav|flac|m4a)$/i.test(n));
    return file?{id,name:String(s.name||''),file:path.join(library,file)}:null;
  }).filter(Boolean);
  const quiet=sources.filter(s=>!/thunder|storm|hail/i.test(s.name));
  if(quiet.length<2) throw new Error('Need at least 2 CC0 non-thunder rain recordings');
  const chosen=quiet.slice(0,Math.min(3,quiet.length));
  const args=[];
  for(const s of chosen) args.push('-stream_loop','-1','-i',s.file);
  const gains=[0.48,0.22,0.10],periods=[53,79,107];
  const stages=chosen.map((s,i)=>{
    return '['+i+':a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,'+
      "volume='"+gains[i]+"*(1+0.12*sin(2*PI*if(isnan(t),0,t)/"+periods[i]+"))':eval=frame"+
      '[a'+i+']';
  });
  const fade=Math.min(3,seconds/8);
  const filters=stages.join(';')+';'+chosen.map((_,i)=>'[a'+i+']').join('')+
    'amix=inputs='+chosen.length+':duration=longest:normalize=0,'+
    'highpass=f=45,lowpass=f=14000,volume=5.0,alimiter=limit=0.88,'+
    'afade=t=in:st=0:d='+fade+',afade=t=out:st='+(seconds-fade)+':d='+fade+'[out]';
  const result=spawnSync('ffmpeg',['-hide_banner','-nostdin','-y',...args,'-filter_complex',filters,
    '-map','[out]','-t',String(seconds),'-ar','48000','-ac','2','-c:a','pcm_s16le',output],
    {stdio:'inherit',shell:false});
  if(result.error) throw result.error;
  if(result.status!==0) throw new Error('Rain V3 FFmpeg failed: '+result.status);
  return {sourceIds:chosen.map(s=>s.id),license:'CC0 metadata; manual verification required'};
}
