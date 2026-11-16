import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createMetadata } from "../modules/metadata.js";
import { normalizeShoppingScenes } from "../modules/shopping/director.js";

const cake={
 name:"수능 합격케이크",description:"합격 축하 케이크, 케이크 구성과 문구를 확인해 주세요.",
 partnerUrl:"https://gift-link.kakao.com/c/cakeexample",
 provider:"kakao-curator",
 images:["product1.jpg","product2.jpg"]
};
test("Kakao direct link appears in YouTube description without deleted landing CTA",()=>{
 const description=createMetadata({title:"합격 케이크",description:""},{product:cake}).description;
 assert.ok(description.includes(cake.partnerUrl));
 assert.ok(description.includes("선물하기 큐레이터"));
 assert.ok(!description.includes("프로필 링크"));
 assert.ok(!description.includes("쿠팡 파트너스 활동"));
});
test("Coupang video description also uses its real referral link",()=>{
 const product={name:"생필품",partnerUrl:"https://link.coupang.com/a/exact"};
 const description=createMetadata({title:"상품 정보"},{product}).description;
 assert.ok(description.includes(product.partnerUrl));
});
test("One product photo fails quality gate before production",()=>{
 assert.throws(()=>normalizeShoppingScenes({scenes:[
 {tts:"오프닝"},{tts:"구성"},{tts:"상세"},{tts:"구매 전 확인"}
 ]},{...cake,images:["only-one.jpg"]}),/2장/);
});
test("Suneung cake scenes remain about that actual occasion",()=>{
 const scenes=normalizeShoppingScenes({scenes:[
 {tts:"어떤 선물을 고를까요?"},{tts:"포장 구성을 확인하세요."},
 {tts:"상세페이지에서 옵션을 체크하세요."},{tts:"구성을 확인하고 선택하세요."}
 ]},cake);
 assert.ok(scenes[0].tts.includes("수능"));
 assert.equal(scenes.length,4);
 assert.ok(scenes.every(x=>x.visualType==="product"));
});
test("Video renderer burns-in ASS on shopping too",()=>{
 const code=fs.readFileSync(new URL("../modules/video/render.js",import.meta.url),"utf8");
 assert.match(code,/const isHotdealVideo = false/);
 assert.match(code,/ass=\$\{subtitle\}/);
});
test("All-products page updates, without retired hotdeal publisher",()=>{
 const manager=fs.readFileSync(new URL("../brain/manager.js",import.meta.url),"utf8");
 const create=fs.readFileSync(new URL("../modules/createShort.js",import.meta.url),"utf8");
 assert.ok(manager.includes("await createLinkPage("));
 assert.ok(!create.includes("await updateShopPage("));
 const html=fs.readFileSync(new URL("../public/shop/index.html",import.meta.url),"utf8");
 assert.ok(html.includes("ALL_PRODUCTS_START"));
 assert.ok(html.includes("ALL_PRODUCTS_END"));
 assert.ok(html.includes("전체상품"));
 assert.ok(!html.includes("HOTDEAL_START"));
 assert.ok(!html.includes("hotdeal-section"));
 assert.ok(!html.includes("category-tab"));
 assert.ok((html.match(/class="product-card"/g)||[]).length>=40);
});
