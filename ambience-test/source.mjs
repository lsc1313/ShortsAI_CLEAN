import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const PEXELS_KEY = process.env.PEXELS_API_KEY;
const PIXABAY_KEY = process.env.PIXABAY_API_KEY;

async function download(url,file){
  const res=await axios.get(url,{responseType:"arraybuffer",timeout:60000});
  fs.writeFileSync(file,res.data);
  return file;
}

function sourceDir(root){
  const dir=path.join(root,"source");
  fs.mkdirSync(dir,{recursive:true});
  return dir;
}

async function pexelsVideo(query,root){
  if(!PEXELS_KEY) return null;
  const res=await axios.get("https://api.pexels.com/v1/videos/search",{
    headers:{Authorization:PEXELS_KEY},
    params:{query,orientation:"landscape",size:"large",per_page:15},
    timeout:30000
  });
  const choices=[];
  for(const v of res.data?.videos||[]){
    for(const f of v.video_files||[]){
      const w=Number(f.width||0),h=Number(f.height||0);
      if(!f.link||f.file_type!=="video/mp4"||w<h||w<1280||h<720) continue;
      choices.push({url:f.link,w,h,id:v.id,page:v.url,user:v.user?.name||"",score:Math.abs(w/h-16/9)});
    }
  }
  choices.sort((a,b)=>a.score-b.score);
  if(!choices.length) return null;
  const pick=choices[Math.floor(Math.random()*Math.min(5,choices.length))];
  const dir=sourceDir(root),file=path.join(dir,"pexels-source.mp4");
  await download(pick.url,file);
  fs.writeFileSync(path.join(dir,"source.json"),JSON.stringify({provider:"Pexels",query,id:pick.id,url:pick.page,user:pick.user},null,2));
  return {file,provider:"pexels",type:"video"};
}

async function pixabayVideo(query,root){
  if(!PIXABAY_KEY) return null;
  const res=await axios.get("https://pixabay.com/api/videos/",{
    params:{key:PIXABAY_KEY,q:query,lang:"en",video_type:"film",safesearch:true,min_width:1280,min_height:720,order:"popular",per_page:15},
    timeout:30000
  });
  const choices=[];
  for(const v of res.data?.hits||[]){
    for(const f of [v.videos?.large,v.videos?.medium,v.videos?.small]){
      const w=Number(f?.width||0),h=Number(f?.height||0);
      if(!f?.url||w<h||w<1280||h<720) continue;
      choices.push({url:f.url,w,h,id:v.id,page:v.pageURL,tags:v.tags||"",score:Math.abs(w/h-16/9)});
    }
  }
  choices.sort((a,b)=>a.score-b.score);
  if(!choices.length) return null;
  const pick=choices[Math.floor(Math.random()*Math.min(5,choices.length))];
  const dir=sourceDir(root),file=path.join(dir,"pixabay-source.mp4");
  await download(pick.url,file);
  fs.writeFileSync(path.join(dir,"source.json"),JSON.stringify({provider:"Pixabay",query,id:pick.id,url:pick.page,tags:pick.tags},null,2));
  return {file,provider:"pixabay",type:"video"};
}

async function pollinationsImage(query,root){
  const prompt=encodeURIComponent(`${query}, photorealistic cinematic ambience, cozy atmospheric environment, no people, no text, no logo, wide establishing shot, 16:9, highly detailed, natural lighting`);
  const url=`https://image.pollinations.ai/prompt/${prompt}?width=1920&height=1080&nologo=true`;
  const dir=sourceDir(root),file=path.join(dir,"ai-source.jpg");
  await download(url,file);
  if(!fs.existsSync(file)||fs.statSync(file).size<10000) return null;
  fs.writeFileSync(path.join(dir,"source.json"),JSON.stringify({provider:"Pollinations",query,type:"generated-image"},null,2));
  return {file,provider:"pollinations",type:"image"};
}

export async function acquireVisual(cfg,root){
  const query=cfg?.source?.query||"rainy night city apartment window";
  const attempts=[
    ["Pexels",()=>pexelsVideo(query,root)],
    ["Pixabay",()=>pixabayVideo(query,root)],
    ["Pollinations",()=>pollinationsImage(query,root)]
  ];
  for(const [name,fn] of attempts){
    try{
      const result=await fn();
      if(result){
        console.log(`[AMBIENCE] SOURCE SELECTED: ${name}`);
        return result;
      }
      console.log(`[AMBIENCE] SOURCE EMPTY: ${name}`);
    }catch(e){
      console.warn(`[AMBIENCE] SOURCE FAILED: ${name}: ${e.message}`);
    }
  }
  return null;
}
