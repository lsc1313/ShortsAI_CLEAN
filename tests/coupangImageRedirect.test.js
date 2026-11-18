import test from "node:test";
import assert from "node:assert/strict";
import { downloadProductImage } from "../modules/shopping/productMedia.js";

const jpeg=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(2000,1)]);
const origin="https://image.coupangcdn.com/image/example.jpg";
const cdn="https://thumbnail.coupangcdn.com/thumbnails/remote/492x492ex/image/example.jpg";
const response=(status,headers={},data=null)=>({status,headers,data});

test("follows Coupang thumbnail HTTP 302 to image CDN and returns real bytes",async()=>{
 const visited=[];
 const req=async(url,options)=>{
   visited.push(url);
   assert.equal(options.maxRedirects,0);
   if(visited.length===1)return response(302,{location:cdn});
   return response(200,{"content-type":"image/jpeg"},jpeg);
 };
 const r=await downloadProductImage(origin,{request:req});
 assert.deepEqual(visited,[origin,cdn]);
 assert.equal(r.redirectHops,1);
 assert.equal(r.finalUrl,cdn);
 assert.deepEqual(r.data,jpeg);
});

test("follows relative HTTPS-safe image redirect and preserves validation",async()=>{
 let calls=0;
 const r=await downloadProductImage(origin,{request:async(url)=>{
   calls++;
   if(calls===1)return response(302,{location:"/image/final.jpg"});
   assert.equal(url,"https://image.coupangcdn.com/image/final.jpg");
   return response(200,{"content-type":"image/jpeg"},jpeg);
 }});
 assert.equal(r.redirectHops,1);
});

test("does not fetch redirection to local or plaintext HTTP destination",async()=>{
 let calls=0;
 await assert.rejects(downloadProductImage(origin,{request:async()=>{
   calls++;
   return response(302,{location:"http://127.0.0.1/internal"});
 }}),/unsafe image redirect/);
 assert.equal(calls,1);
});

test("rejects redirect loops and excessive redirects",async()=>{
 await assert.rejects(downloadProductImage(origin,{request:async()=>response(302,{location:origin})}),/redirect loop/);
 let i=0;
 await assert.rejects(downloadProductImage(origin,{maxHops:2,request:async()=>response(302,{location:"https://image.coupangcdn.com/next"+(++i)+".jpg"})}),/too many image redirects/);
});

test("rejects HTML and non-image bodies after redirects",async()=>{
 await assert.rejects(downloadProductImage(origin,{request:async()=>response(200,{"content-type":"text/html"},jpeg)}),/non-image/);
 await assert.rejects(downloadProductImage(origin,{request:async()=>response(200,{"content-type":"image/jpeg"},Buffer.from("not a JPEG"))}),/invalid bytes/);
});

test("reports CDN 403 explicitly, separate from image count",async()=>{
 await assert.rejects(downloadProductImage(origin,{request:async()=>response(403,{"content-type":"text/html"})}),e=>e.status===403);
});
