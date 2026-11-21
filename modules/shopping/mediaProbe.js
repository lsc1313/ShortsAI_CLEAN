import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {collectCoupangGallery,officialProductPageUrl} from "../coupang/galleryCollector.js";
import {downloadProductImage} from "./productMedia.js";

const isId = value => /^\d+$/.test(String(value||""));
const mimeExtension = bytes => bytes[0]===0x89?".png":bytes.toString("ascii",0,4)==="RIFF"?".webp":".jpg";
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const looksLikeImage = bytes => bytes.length>1000 && (
  bytes[0]===0xff&&bytes[1]===0xd8 ||
  bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e ||
  bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP"
);

/**
 * Standalone, read-only investigation of *actual* product photo availability.
 * Does not touch Brain/YouTube, never fabricates pictures, never bypasses
 * challenges. A positive result requires separately downloaded image bytes.
 */
export async function probeCoupangProductMedia({
  productId,itemId="",pageUrl="",heroUrl="",outputDir="",target=4,maxImages=6
},{
  collect=collectCoupangGallery,
  download=downloadProductImage,
  logger=console
}={}){
  if(!isId(productId))throw new Error("productId must be a numeric Coupang product ID");
  if(itemId && !isId(itemId))throw new Error("itemId must be numeric");
  const required=Math.max(2,Math.min(6,Number(target)||4));
  const max=Math.max(required,Math.min(12,Number(maxImages)||6));
  const u=new URL(officialProductPageUrl(productId,pageUrl));
  if(itemId)u.searchParams.set("itemId",String(itemId));
  const officialUrl=u.href;
  const gallery=await collect({productId:String(productId),pageUrl:officialUrl},{logger});
  const sources=[...new Set([
    ...(heroUrl?[String(heroUrl)]:[]),
    ...(gallery?.verified && Array.isArray(gallery.images)?gallery.images:[])
  ])].slice(0,24);
  const photos=[],shaSet=new Set(),rejected={};
  const reject=reason=>{rejected[reason]=(rejected[reason]||0)+1};
  // Avoid creating any directories before there is at least one real image.
  const dest=outputDir?path.resolve(outputDir):"";
  for(const source of sources){
    if(photos.length>=max)break;
    try{
      const result=await download(source);
      const bytes=Buffer.from(result?.data||[]);
      if(!looksLikeImage(bytes)){reject("invalid-image-bytes");continue;}
      const fingerprint=hash(bytes);
      if(shaSet.has(fingerprint)){reject("duplicate-image-bytes");continue;}
      shaSet.add(fingerprint);
      const filename="photo_"+String(photos.length+1).padStart(2,"0")+mimeExtension(bytes);
      if(dest){
        await fs.mkdir(dest,{recursive:true});
        await fs.writeFile(path.join(dest,filename),bytes);
      }
      photos.push({
        filename:dest?path.join(dest,filename):null,
        source:source===heroUrl?"official-hero":"exact-page-gallery",
        sha256:fingerprint,
        bytes:bytes.length
      });
    }catch(error){
      reject("download-"+String(error?.code||error?.status||"failed").toLowerCase().slice(0,80));
    }
  }
  const report={
    productId:String(productId),
    itemId:String(itemId||""),
    officialUrl,
    status:photos.length>=required?"ready":gallery?.reason==="page-access-challenge"?"page-access-challenge":"insufficient-real-photos",
    targetPhotos:required,distinctPhotos:photos.length,
    candidateUrls:sources.length,
    gallery:{verified:gallery?.verified===true,reason:gallery?.reason||"unavailable",
      candidates:Array.isArray(gallery?.images)?gallery.images.length:0},
    rejected,photos
  };
  logger.log("[PRODUCT MEDIA PROBE]",{
    productId:report.productId,status:report.status,
    distinctPhotos:report.distinctPhotos,targetPhotos:required,
    galleryReason:report.gallery.reason,candidateUrls:report.candidateUrls
  });
  return report;
}
