import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import axios from "axios";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ALLOWED_PAGES = ["gift-link.kakao.com","gift.kakao.com","shopping.kakao.com","m.shopping.kakao.com","www.coupang.com","m.coupang.com","link.coupang.com"];
const allowedPage = url => { try { const u=new URL(url);return u.protocol==="https:"&&ALLOWED_PAGES.includes(u.hostname); }catch{return false;} };
const htmlDecode = x => String(x||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");
const normalizeImage = (value,base="https://gift.kakao.com/") => {
  try {
    const v = typeof value==="string" ? value : value?.url || value?.contentUrl || "";
    const u=new URL(htmlDecode(v),base);
    if(u.protocol!=="https:" || u.username || u.password ||
       /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(u.hostname) ||
       !u.hostname.includes(".")) return "";
    if(/(?:logo|icon|sprite|badge|avatar|emoji|favicon|tracking|pixel)/i.test(u.pathname))return "";
    return u.href;
  }catch{return "";}
};
const dedupe = arr => [...new Set(arr.filter(Boolean))];
const getMeta = (html,key) => {
 const tags=String(html||"").match(/<meta\b[^>]*>/gi)||[];
 for(const tag of tags){
   const prop=tag.match(/\b(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1];
   if(prop?.toLowerCase()!==key.toLowerCase())continue;
   return htmlDecode(tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1]||"");
 }
 return "";
};
const jsonLdProducts = html => {
 const output=[];
 for(const m of String(html||"").matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
   try{
     const root=JSON.parse(htmlDecode(m[1]));
     const visit=(item,depth=0)=>{
       if(depth>7||!item||typeof item!=="object")return;
       if(Array.isArray(item)) { for(const child of item)visit(child,depth+1);return; }
       const type=[].concat(item["@type"]||[]);
       if(type.some(x=>String(x).toLowerCase()==="product"))output.push(item);
       if(item["@graph"])visit(item["@graph"],depth+1);
       if(item.mainEntity)visit(item.mainEntity,depth+1);
     };
     visit(root);
   }catch{}
 }
 return output;
};
function imageNodes(html,base){
 const srcs=[];
 // Only explicit gallery/product image attributes; never scrape arbitrary
 // recommendations, tracking pixels or decorative page assets.
 for(const tag of (String(html||"").match(/<img\b[^>]*>/gi)||[])){
   if(/recommend|related|suggest|advertisement|sponsor/i.test(tag))continue;
   if(!/(?:product-gallery|product-image|goods-image|detail-image|gallery|main-image|data-zoom-image)/i.test(tag))continue;
   for(const attr of ["data-zoom-image","data-src","src"]){
     const value=tag.match(/(?:data-zoom-image|data-src|src)\s*=\s*["\x27]([^"\x27]+)["\x27]/i)?.[1];
     if(value)srcs.push(normalizeImage(value,base));
   }
 }
 return srcs;
}
export function extractProductPage(html, pageUrl, {expectedName="", requireIdentity=false}={}) {
 const products=jsonLdProducts(html);
 const title = getMeta(html,"og:title") || products[0]?.name || "";
 const description= products[0]?.description || getMeta(html,"og:description") || "";
 const nameTokens=String(expectedName).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu," ").split(/\s+/).filter(x=>x.length>=2);
 const foundName=String(products[0]?.name||title).toLowerCase();
 const hits=nameTokens.filter(x=>foundName.includes(x)).length;
 const matches=!nameTokens.length || hits >= Math.min(2,nameTokens.length);
 const generic=/^(?:카카오톡? 선물하기|선물하기|kakao(?:talk)?(?: gift)?|coupang|쿠팡)$/i.test(String(products[0]?.name||title).trim());
 const verified=Boolean(matches && !generic && (products.length || getMeta(html,"og:title")));
 if(!verified)return {name:"",description:"",images:[],verified:false,source:"unverified"};
 const primary=normalizeImage(getMeta(html,"og:image"),pageUrl);
 const productImages=products.flatMap(p=>[].concat(p.image||[])).map(x=>normalizeImage(x,pageUrl));
 const gallery=imageNodes(html,pageUrl);
 const images=dedupe([...productImages,...(verified?[primary,...gallery]:[]) ]).slice(0,12);
 const price=products.map(p=>p?.offers?.price||p?.offers?.[0]?.price).find(x=>Number(x)>0);
 return {name:String(products[0]?.name||title||"").trim(),description:String(description||"").replace(/<[^>]*>/g," ").trim().slice(0,900),price:price?Number(price):null,images,verified,source:products.length?"jsonld":primary?"opengraph":"none"};
}
export async function discoverProductPage(link,{expectedName="",fetchImpl=fetch}={}) {
 if(!allowedPage(link))return {name:"",description:"",images:[],verified:false,source:"blocked"};
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),12000);
 try{
   // redirect: manual prevents blindly following an open redirect to an
   // unrelated host. Only explicitly followed approved Kakao/Coupang pages.
   let target=link, html="", finalUrl=link;
   for(let i=0;i<4;i++){
     const res=await fetchImpl(target,{signal:controller.signal,redirect:"manual",headers:{"User-Agent":"Mozilla/5.0","Accept":"text/html"}});
     if([301,302,303,307,308].includes(res.status)){
       const next=new URL(res.headers.get("location")||"",target).href;
       if(!allowedPage(next))break;
       target=next;continue;
     }
     if(!res.ok)break;
     finalUrl=target;html=await res.text();break;
   }
   return extractProductPage(html,finalUrl,{expectedName,requireIdentity:true});
 }catch{return {name:"",description:"",images:[],verified:false,source:"unavailable"};}
 finally{clearTimeout(timer);}
}
const isImageBuffer=b=> b.length>1000 && (
 (b[0]===0xff&&b[1]===0xd8)||
 (b[0]===0x89&&b[1]===0x50&&b[2]===0x4e)||
 (b.toString("ascii",0,4)==="RIFF"&&b.toString("ascii",8,12)==="WEBP")
);
export async function stageProductImages(product, candidates, {maxImages=6}={}){
 const id=crypto.createHash("sha256").update(product.partnerUrl||product.name).digest("hex").slice(0,20);
 const dir=path.resolve("media/products/verified",id);
 fs.mkdirSync(dir,{recursive:true});
 const images=[], publicImages=[];
 for(const source of dedupe(candidates).slice(0,16)){
   if(images.length>=maxImages)break;
   try{
     let data,ext=".jpg";
     if(/^https:\/\//i.test(source)){
       const u=normalizeImage(source);
       if(!u)continue;
       const response=await axios.get(u,{responseType:"arraybuffer",timeout:14000,maxContentLength:15*1024*1024,maxRedirects:0,headers:{"User-Agent":"Mozilla/5.0","Accept":"image/*"}});
       data=Buffer.from(response.data);
       if(!String(response.headers["content-type"]||"").startsWith("image/"))continue;
       publicImages.push(u);
     }else{
       let local=String(source||"");
       if(local.startsWith("/media/"))local=path.join(process.cwd(),local.slice(1));
       else if(local.startsWith("media/"))local=path.resolve(local);
       else if(path.isAbsolute(local))local=path.resolve(local);
       else continue;
       if(!fs.existsSync(local))continue;
       data=fs.readFileSync(local);
     }
     if(!isImageBuffer(data))continue;
     if(data.toString("ascii",0,4)==="RIFF")ext=".webp";
     if(data[0]===0x89)ext=".png";
     const filename=path.join(dir,"photo_"+String(images.length+1).padStart(2,"0")+ext);
     fs.writeFileSync(filename,data);
     // Actual product remains entirely in frame even for square packshots.
     // The background is a blur of that same product photo, never stock media.
     const portrait=filename.replace(/\.(jpg|png|webp)$/i,"_portrait.png");
     const vf="[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:2[bg];[0:v]scale=1000:1660:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[out]";
     const render=spawnSync("ffmpeg",["-y","-loglevel","error","-i",filename,"-filter_complex",vf,"-map","[out]","-frames:v","1",portrait],{timeout:30000});
     images.push(render.status===0 && fs.existsSync(portrait)?portrait:filename);
   }catch{/* inaccessible images are skipped, not replaced with unrelated stock */ }
 }
 if(!images.length)throw new Error("실제 상품 이미지 확보 실패: 영상 제작 보류");
 return {...product, images, publicImages:dedupe([...publicImages,...(product.publicImages||[])]),productMediaVerified:true};
}

export async function prepareShoppingProduct(product) {
  if(!product?.partnerUrl)throw new Error("SHOPPING: 원본 제휴 링크가 필요합니다.");
  if(product.productMediaVerified===true && product.images?.length)return product;
  const link=product.provider==="kakao-curator" ? product.partnerUrl : (product.sourceUrl||product.detailUrl||product.partnerUrl);
  const info=await discoverProductPage(link,{expectedName:product.name||""});
  const images=dedupe([...(product.images||[]),...(product.galleryImages||[]),...(info.verified?info.images:[])]).slice(0,16);
  const merged={
    ...product,
    name:product.name||info.name,
    description:product.description||((info.verified)?info.description:""),
    price:product.price||((info.verified)?info.price:null),
    mediaSource:info.source
  };
  if(!merged.name || !images.length)throw new Error("SHOPPING: 상품 상세정보/실제 이미지가 없어 업로드 보류");
  return stageProductImages(merged,images,{maxImages:6});
}
