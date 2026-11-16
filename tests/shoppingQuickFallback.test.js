import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { chooseQuickCoupangProduct } from "../modules/shopping/quickCoupang.js";

const noop={log(){},warn(){}};
const base = [
  {productId:"1",title:"폴드8 케이스 A",price:20000,image:"https://images.example/a.jpg",url:"https://www.coupang.com/vp/products/1"},
  {productId:"2",title:"폴드8 케이스 B",price:30000,image:"https://images.example/b.jpg",url:"https://www.coupang.com/vp/products/2"}
];

test("QUICK retries next Coupang product when first only has one image",async()=>{
  const tries=[], links=[];
  const result=await chooseQuickCoupangProduct("폴드8 케이스",{
    search:async(term,limit)=>{assert.equal(term,"폴드8 케이스");assert.equal(limit,8);return base;},
    partnerLink:async(url)=>{links.push(url);return "https://link.coupang.com/"+url.split("/").at(-1);},
    resolve:async()=>{throw Error("COUPANG product details unavailable");},
    prepare:async(item)=>{
      tries.push(item);
      if(tries.length===1)throw Error("SHOPPING_MEDIA_INSUFFICIENT: only one actual photo");
      return {...item,productMediaVerified:true,images:["verified-1.jpg","verified-2.jpg"]};
    },
    logger:noop
  });
  assert.equal(result.product.name,"폴드8 케이스 B");
  assert.equal(result.product.images.length,2);
  assert.equal(result.selectedIndex,2);
  assert.equal(tries.length,2);
  assert.equal(links.length,2);
  assert.equal(tries[0].images[0],base[0].image);
  assert.equal(tries[1].images[0],base[1].image);
  assert.equal(tries[1].galleryImages.length,0);
});

test("QUICK uses verified detail gallery of the same product",async()=>{
  let received;
  const result=await chooseQuickCoupangProduct("폴드8",{
    search:async()=>base.slice(0,1),
    partnerLink:async()=> "https://link.coupang.com/one",
    resolve:async()=>({resolved:true,productTitle:"폴드8 케이스 A",detailUrl:base[0].url,price:21000,galleryImages:["https://images.example/a2.jpg"]}),
    prepare:async p=>{received=p;return {...p,images:["1.jpg","2.jpg"],productMediaVerified:true};},
    logger:noop
  });
  assert.equal(result.product.price,21000);
  assert.deepEqual(received.galleryImages,["https://images.example/a2.jpg"]);
  assert.deepEqual(received.images,[base[0].image]);
});

test("QUICK keeps production blocked when no candidate offers even a real single photo",async()=>{
  let count=0;
  await assert.rejects(chooseQuickCoupangProduct("폴드8",{
    search:async()=>base,
    partnerLink:async()=> "https://link.coupang.com/test",
    resolve:async()=>null,
    prepare:async()=>{count++;throw Error("SHOPPING_MEDIA_INSUFFICIENT: insufficient photos");},
    logger:noop
  }),/정보형 대체 제작도 불가능합니다/);
  assert.equal(count,4); // two strict attempts plus two real-photo fallback attempts
});

test("QUICK rejects false-positive prepared object without 2 distinct validated photos",async()=>{
  await assert.rejects(chooseQuickCoupangProduct("폴드8",{
    search:async()=>base.slice(0,1),
    partnerLink:async()=> "https://link.coupang.com/test",
    resolve:async()=>null,
    prepare:async p=>({...p,images:["photo.jpg"],productMediaVerified:true}),
    logger:noop
  }),/SHOPPING_MEDIA_INSUFFICIENT/);
});

test("QUICK no longer selects a single API search item and downloads only that image",()=>{
  const server=fs.readFileSync(new URL("../server.js",import.meta.url),"utf8");
  const start=server.indexOf('"/shopping/create"');
  const end=server.indexOf('"/brain/start"',start);
  const block=server.slice(start,end);
  assert.match(block,/await chooseQuickCoupangProduct\(keyword\)/);
  assert.doesNotMatch(block,/await searchProduct\(/);
  assert.doesNotMatch(block,/await downloadImage\(/);
  assert.match(block,/BrainQueue\.start\(/);
});

test("Coupang API retains single-result search for backward compatibility",()=>{
  const api=fs.readFileSync(new URL("../modules/coupang/index_api.js",import.meta.url),"utf8");
  assert.match(api,/export async function searchProducts/);
  assert.match(api,/export async function searchProduct\(keyword\)/);
  assert.match(api,/searchProducts\(keyword, 1\)/);
});

test("QUICK prefers multi-photo product before any honest single-photo fallback",async()=>{
  const calls=[];
  const result=await chooseQuickCoupangProduct("폴드8",{
    search:async()=>base,
    partnerLink:async()=> "https://link.coupang.com/test",
    resolve:async()=>null,
    prepare:async(p,opts={})=>{
      calls.push({name:p.name,allowSinglePhoto:opts.allowSinglePhoto===true});
      if (opts.allowSinglePhoto) return {...p,images:["one.jpg"],productMediaVerified:true,singlePhotoMode:true,distinctPhotoCount:1};
      if(p.name.endsWith("A"))throw Error("SHOPPING_MEDIA_INSUFFICIENT");
      return {...p,images:["one.jpg","two.jpg"],productMediaVerified:true,singlePhotoMode:false,distinctPhotoCount:2};
    },
    logger:noop
  });
  assert.equal(result.product.name,"폴드8 케이스 B");
  assert.deepEqual(calls.map(c=>c.allowSinglePhoto),[false,false]);
});

test("QUICK after exhausting strict products uses correctly labelled one-photo mode",async()=>{
  const calls=[];
  const result=await chooseQuickCoupangProduct("폴드8",{
    search:async()=>base,
    partnerLink:async()=> "https://link.coupang.com/test",
    resolve:async()=>null,
    prepare:async(p,opts={})=>{
      calls.push({name:p.name,allowSinglePhoto:opts.allowSinglePhoto===true});
      if (!opts.allowSinglePhoto)throw Error("SHOPPING_MEDIA_INSUFFICIENT: 1 photo");
      return {...p,images:["real-photo.jpg"],productMediaVerified:true,singlePhotoMode:true,distinctPhotoCount:1};
    },
    logger:noop
  });
  assert.equal(result.product.name,"폴드8 케이스 A");
  assert.equal(result.product.singlePhotoMode,true);
  assert.equal(result.product.distinctPhotoCount,1);
  assert.deepEqual(calls.map(c=>c.allowSinglePhoto),[false,false,true]);
});

test("one-photo mode requires explicit verified single-photo origin",async()=>{
  await assert.rejects(chooseQuickCoupangProduct("폴드8",{
    search:async()=>base.slice(0,1),
    partnerLink:async()=> "https://link.coupang.com/test",
    resolve:async()=>null,
    prepare:async(p,opts={})=>{
      if(!opts.allowSinglePhoto)throw Error("SHOPPING_MEDIA_INSUFFICIENT");
      return {...p,images:["photo.jpg"],productMediaVerified:true};
    },
    logger:noop
  }),/정보형 대체 제작도 불가능합니다/);
});
