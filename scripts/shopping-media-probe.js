#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import {probeCoupangProductMedia} from "../modules/shopping/mediaProbe.js";

const args=process.argv.slice(2);
const val=flag=>{
  const at=args.indexOf(flag);
  return at<0?"":args[at+1]||"";
};
const productId=args.find(arg=>/^\d+$/.test(arg))||"";
if(!productId || args.includes("--help")){
  console.log("Usage: npm run shopping-media-probe -- PRODUCT_ID [--itemId ITEM_ID] [--hero URL] [--out DIRECTORY]");
  process.exitCode=productId?0:2;
}else{
  const outputDir=val("--out")||path.join("media","products","probe",productId);
  try{
    const report=await probeCoupangProductMedia({
      productId,itemId:val("--itemId"),heroUrl:val("--hero"),outputDir
    });
    const manifest=path.resolve(outputDir,"report.json");
    await fs.mkdir(path.dirname(manifest),{recursive:true});
    await fs.writeFile(manifest,JSON.stringify(report,null,2)+"\n","utf8");
    console.log("[PRODUCT MEDIA PROBE] report:",manifest);
    if(report.status!=="ready")process.exitCode=1;
  }catch(error){
    console.error("[PRODUCT MEDIA PROBE] failed:",String(error?.message||error));
    process.exitCode=2;
  }
}
