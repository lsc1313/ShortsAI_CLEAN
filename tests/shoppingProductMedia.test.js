import test from "node:test";
import assert from "node:assert/strict";
import {extractProductPage,discoverProductPage} from "../modules/shopping/productMedia.js";
import {normalizeShoppingScenes} from "../modules/shopping/director.js";

const html='<!doctype html><meta property="og:title" content="옵티젠 마스터 컬렉션 멀티팩 30포">'+
'<meta property="og:image" content="https://img.example.com/main.jpg">'+
'<script type="application/ld+json">'+JSON.stringify({
  "@context":"https://schema.org","@type":"Product",
  name:"옵티젠 마스터 컬렉션 멀티팩 30포",
  description:"30포 구성의 선물세트",
  image:["https://img.example.com/main.jpg","https://img.example.com/detail.jpg"],
  offers:{"@type":"Offer",price:"45000"}
})+'</script>'+
'<img class="product-gallery" src="https://img.example.com/angle.jpg">'+
'<img class="recommended" src="https://img.example.com/other-product.jpg">';

test("Curator gallery is sourced from product JSON-LD and product images, not recommendations",()=>{
 const result=extractProductPage(html,"https://gift.kakao.com/product/123",{expectedName:"옵티젠 마스터 컬렉션"});
 assert.equal(result.verified,true);
 assert.equal(result.price,45000);
 assert.equal(result.images.length,3);
 assert.ok(result.images.every(x=>!x.includes("other-product")));
 assert.ok(result.description.includes("30포"));
});
test("Identity mismatch prevents unrelated product photos",()=>{
 const result=extractProductPage(html,"https://gift.kakao.com/product/123",{expectedName:"샤오미 로봇청소기"});
 assert.equal(result.verified,false);
 assert.equal(result.images.length,0);
});
test("Curator link will not blindly redirect to unrelated hosts",async()=>{
 const result=await discoverProductPage("https://gift-link.kakao.com/c/abc",{
  fetchImpl:async()=>({status:302,headers:{get:()=>"https://evil.example.com/redirect"},ok:false})
 });
 assert.deepEqual(result.images,[]);
});
test("Shopping scenes always use actual product photos, even if AI tries stock scenes",()=>{
 const product={name:"상품",images:["photo1.jpg","photo2.jpg"]};
 const scenes=normalizeShoppingScenes({work_instructions:{scenes:[
  {tts:"이 상품의 기준은 뭘까요?",imageQueries:["random stock"]},
  {tts:"선택 기준 첫번째",visualType:"scene"},
  {tts:"선택 기준 두번째",visualType:"scene"},
  {tts:"결론을 확인해 보세요."}
 ]}},product);
 assert.equal(scenes.length,4);
 assert.ok(scenes.every(x=>x.visualType==="product"&&x.imageQueries.length===0));
 assert.equal(scenes[0].motion,"zoom_in");
 assert.equal(scenes[1].motion,"zoom_out");
});

test("Verified one-photo information mode maps the genuine photo to all scenes without creating fake gallery",()=>{
 const product={
   name:"폴드8 케이스",images:["real-coupang-photo.jpg"],
   singlePhotoMode:true,productMediaVerified:true,distinctPhotoCount:1
 };
 const scenes=normalizeShoppingScenes({work_instructions:{scenes:[
   {tts:"이 케이스를 살 때 먼저 확인할 점은?"},
   {tts:"힌지 보호 구조를 확인하세요."},
   {tts:"맥세이프 기능은 지원 모델을 확인하세요."},
   {tts:"구매 전 호환성을 확인해보세요."}
 ]}},product);
 assert.equal(scenes.length,4);
 assert.ok(scenes.every(s=>s.visualType==="product"&&s.product.singlePhotoMode===true));
 assert.notEqual(scenes[0].cameraMove,scenes[1].cameraMove);
});
test("Unverified single photo cannot bypass the product gate",()=>{
 assert.throws(()=>normalizeShoppingScenes({scenes:[
   {tts:"한"}, {tts:"두"}, {tts:"세"}, {tts:"네"}
 ]},{name:"상품",images:["photo.jpg"],singlePhotoMode:true}),/2장 이상/);
});
