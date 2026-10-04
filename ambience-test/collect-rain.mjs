import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const TOKEN=process.env.FREESOUND_API_KEY;
if(!TOKEN) throw new Error("FREESOUND_API_KEY is missing from .env");

const ROOT="D:/ShortsAI_DATA/ambience-library";
const TYPE="rain";
const DIR=path.join(ROOT,TYPE);
fs.mkdirSync(DIR,{recursive:true});

const queries=[
  "rain window ambience",
  "steady rain field recording",
  "rain room window",
  "heavy rain ambience"
];

function isCC0(s){
  return /creativecommons\.org\/publicdomain\/zero\/1\.0/i.test(String(s.license||"")) ||
         /^cc0$/i.test(String(s.license||"").trim());
}
function score(s){
  let n=0;
  const dur=Number(s.duration||0);
  if(dur>=120)n+=5; else if(dur>=60)n+=3; else if(dur>=30)n+=1;
  if(Number(s.samplerate||0)>=48000)n+=2;
  if(Number(s.channels||0)>=2)n+=2;
  if(/wav|flac/i.test(String(s.type||"")))n+=2;
  return n;
}
async function search(q){
  const r=await axios.get("https://freesound.org/apiv2/search/text/",{
    headers:{Authorization:`Token ${TOKEN}`},
    params:{
      query:q,
      filter:'license:"Creative Commons 0"',
      fields:"id,name,url,license,duration,channels,samplerate,type,previews,username",
      page_size:50
    },
    timeout:30000
  });
  return r.data?.results||[];
}
async function downloadSound(s){
  // Freesound original-file /download/ requires OAuth2. For unattended
  // collection we intentionally use the API-provided high-quality preview,
  // which is accessible with token authentication.
  const preview=s.previews?.["preview-hq-mp3"] || s.previews?.["preview-hq-ogg"];
  if(!preview) throw new Error(`No HQ preview available for sound ${s.id}`);
  const ext=preview.includes(".ogg")?"ogg":"mp3";
  const file=path.join(DIR,`${s.id}.preview-hq.${ext}`);
  if(!fs.existsSync(file)){
    const r=await axios.get(preview,{responseType:"arraybuffer",timeout:120000,maxContentLength:200*1024*1024});
    fs.writeFileSync(file,r.data);
  }
  const meta={
    id:s.id,name:s.name,creator:s.username,url:s.url,license:s.license,
    duration:s.duration,channels:s.channels,samplerate:s.samplerate,type:s.type,
    acquiredAs:"Freesound HQ preview",originalQuality:false,
    downloadedAt:new Date().toISOString(),purpose:TYPE
  };
  fs.writeFileSync(path.join(DIR,`${s.id}.license.json`),JSON.stringify(meta,null,2));
  return {file,meta};
}

