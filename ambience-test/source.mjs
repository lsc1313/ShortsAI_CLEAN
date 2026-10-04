import fs from "fs";
import path from "path";
import https from "https";

function requestJson(url, headers={}) {
  return new Promise((resolve,reject)=>{
    https.get(url,{headers},res=>{
      let data="";
      res.on("data",c=>data+=c);
      res.on("end",()=>{
        if(res.statusCode<200||res.statusCode>=300) return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0,200)}`));
        try{ resolve(JSON.parse(data)); }catch(e){ reject(e); }
      });
    }).on("error",reject);
  });
}
function download(url,file){
  return new Promise((resolve,reject)=>{
    const go=u=>https.get(u,res=>{
      if(res.statusCode>=300&&res.statusCode<400&&res.headers.location) return go(new URL(res.headers.location,u).toString());
      if(res.statusCode!==200) return reject(new Error(`download HTTP ${res.statusCode}`));
      const out=fs.createWriteStream(file); res.pipe(out); out.on("finish",()=>out.close(()=>resolve(file)));
    }).on("error",reject);
    go(url);
  });
}
export async function acquireVisual(cfg, root){
  const key=process.env.PEXELS_API_KEY;
  if(!key) return null;
  const q=encodeURIComponent(cfg?.source?.query||"rainy night city window");
  const data=await requestJson(`https://api.pexels.com/v1/videos/search?query=${q}&orientation=landscape&size=large&per_page=15`,{Authorization:key});
  const videos=(data.videos||[]).filter(v=>Array.isArray(v.video_files));
  const choices=[];
  for(const v of videos){
    for(const f of v.video_files){
      if(!f.link||!f.width||!f.height) continue;
      if(f.width<f.height||f.width<1280) continue;
      choices.push({video:v,file:f,score:Math.abs((f.width/f.height)-(16/9))+Math.abs(f.width-1920)/10000});
    }
  }
  choices.sort((a,b)=>a.score-b.score);
  if(!choices.length) return null;
  const pick=choices[Math.floor(Math.random()*Math.min(5,choices.length))];
  const dir=path.join(root,"source"); fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,"pexels-source.mp4");
  await download(pick.file.link,file);
  fs.writeFileSync(path.join(dir,"source.json"),JSON.stringify({provider:"Pexels",id:pick.video.id,url:pick.video.url,user:pick.video.user?.name||"",query:cfg.source.query},null,2));
  return {file,provider:"pexels",type:"video"};
}
