import test from "node:test";
import assert from "node:assert/strict";
import {collectCoupangGallery,productPageMatches,validateGalleryResult,officialProductPageUrl} from "../modules/coupang/galleryCollector.js";
import {chooseQuickCoupangProduct} from "../modules/shopping/quickCoupang.js";

const productId="9710180536";
const pageUrl="https://www.coupang.com/vp/products/9710180536?itemId=29052191811";
const logger={log(){},warn(){}};
test("exact product URL matches URL path and prevents unrelated gallery",()=>{
 assert.equal(productPageMatches(pageUrl,productId),true);
 assert.equal(productPageMatches("https://www.coupang.com/vp/products/12345",productId),false);
 assert.equal(productPageMatches("https://www.coupang.com/vp/products/97101805360",productId),false);
 assert.equal(productPageMatches("https://other.example.com/vp/products/"+productId,productId),false);
 assert.equal(productPageMatches("http://www.coupang.com/vp/products/"+productId,productId),false);
});

test("only actual product page can yield browser gallery photos",async()=>{
 const r=await collectCoupangGallery({productId,pageUrl},{
   visit:async()=>({
     finalUrl:pageUrl,images:[
       "https://thumbnail.coupangcdn.com/a.jpg",
       "//thumbnail.coupangcdn.com/b.jpg",
       "https://thumbnail.coupangcdn.com/a.jpg",
       "https://127.0.0.1/private.jpg",
       "javascript:alert(1)"
     ]
   }),logger
 });
 assert.equal(r.verified,true);
 assert.deepEqual(r.images,[
   "https://thumbnail.coupangcdn.com/a.jpg",
   "https://thumbnail.coupangcdn.com/b.jpg"
 ]);
});

test("marketing redirect to unrelated product ID yields no gallery",async()=>{
 const r=await collectCoupangGallery({productId,pageUrl},{
   visit:async()=>({
     finalUrl:"https://www.coupang.com/vp/products/1234",
     images:["https://thumbnail.coupangcdn.com/wrong-sku.jpg"]
   }),logger
 });
 assert.equal(r.verified,false);
 assert.deepEqual(r.images,[]);
});

test("QUICK uses exact-SKU gallery photos before product preparation",async()=>{
 let prepped;
 const result=await chooseQuickCoupangProduct("폴드8",{
   search:async()=>[{productId,title:"폴드8 케이스",price:20000,url:pageUrl,image:"https://thumbnail.coupangcdn.com/hero.jpg"}],
   partnerLink:async()=> "https://link.coupang.com/test",
   resolve:async()=>{throw Error("COUPANG 상품 객체 추출 실패 target_object_not_found");},
   gallery:async()=>({verified:true,images:[
     "https://thumbnail.coupangcdn.com/second.jpg",
     "https://thumbnail.coupangcdn.com/third.jpg",
     "https://thumbnail.coupangcdn.com/fourth.jpg"
   ]}),
   prepare:async p=>{
     prepped=p;
     return {...p,productMediaVerified:true,images:["1.jpg","2.jpg","3.jpg","4.jpg"]};
   },logger
 });
 assert.equal(result.selectedIndex,1);
 assert.deepEqual(prepped.galleryImages,[
   "https://thumbnail.coupangcdn.com/second.jpg",
   "https://thumbnail.coupangcdn.com/third.jpg",
   "https://thumbnail.coupangcdn.com/fourth.jpg"
 ]);
 assert.equal(prepped.images.length,1);
 assert.equal(result.product.images.length,4);
});

test("browser unavailable leaves manual product verification closed, no foreign images",async()=>{
 const r=await collectCoupangGallery({productId,pageUrl},{
   visit:async()=>{throw Error("Could not find Chrome executable");},logger
 });
 assert.equal(r.verified,false);
 assert.deepEqual(r.images,[]);
});

test("rejects attacker-controlled redirect even if image looks valid",()=>{
 const r=validateGalleryResult({
   finalUrl:"https://example.com/vp/products/"+productId,
   images:["https://thumbnail.coupangcdn.com/third.jpg"]
 },{productId,pageUrl});
 assert.equal(r.verified,false);
});

test("affiliate redirect resolves to official exact SKU page, keeping itemId",()=>{
 assert.equal(officialProductPageUrl(productId,"https://www.coupang.com/vp/products/"+productId),pageUrl.split("?")[0]);
 assert.equal(officialProductPageUrl(productId,"https://www.coupang.com/re/AFFSDP?itemId=29052191811"),
   pageUrl);
 assert.equal(officialProductPageUrl(productId,"https://link.coupang.com/re/AFFSDP"),
   "https://www.coupang.com/vp/products/"+productId);
 assert.equal(officialProductPageUrl("bad-id","https://link.coupang.com/re/AFFSDP"),"");
});

test("gallery collector emits visible diagnostics for invalid original product link",async()=>{
 const logs=[];
 const result=await collectCoupangGallery({productId,pageUrl:"https://link.coupang.com/re/AFFSDP"},{
   visit:async()=>{throw Error("should not visit invalid link");},
   logger:{log:(...x)=>logs.push(x),warn:(...x)=>logs.push(x)}
 });
 assert.equal(result.verified,false);
 assert.ok(logs.some(x=>x[0]==="[COUPANG BROWSER GALLERY]"&&x[1].reason==="invalid-official-product-url"));
});
