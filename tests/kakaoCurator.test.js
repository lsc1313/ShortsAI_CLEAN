import test from "node:test";
import assert from "node:assert/strict";
import { isCuratorLink, validCuratorProduct, chooseCuratorProduct, DISCLOSURE } from "../modules/kakaoCurator/store.js";
import { createMetadata } from "../modules/metadata.js";

const link = "https://gift-link.kakao.com/c/73zu3HCp";
const product = {
  provider: "kakao-curator",
  partnerUrl: link,
  name: "옵티젠 마스터 컬렉션 종합비타민 멀티팩 30포",
  enabled: true,
  images: ["https://example.com/product.jpg"]
};
test("Only Kakao gift curator attribution links accepted", () => {
  assert.ok(isCuratorLink(link));
  assert.equal(isCuratorLink("https://gift-link.kakao.com.evil.test/c/a"),false);
  assert.equal(isCuratorLink("https://gift-link.kakao.com/other/a"),false);
  assert.equal(isCuratorLink("http://gift-link.kakao.com/c/a"),false);
});
test("Unverified curator media cannot be published", () => {
  assert.equal(validCuratorProduct({...product,images:[]}), false);
  assert.equal(validCuratorProduct(product),true);
});
test("Kakao shorts description uses only Kakao curator disclosure", () => {
  const meta = createMetadata({title:"선물 고르는 기준",description:"구성 확인"}, {product});
  assert.ok(meta.description.includes(DISCLOSURE));
  assert.ok(!meta.description.includes("쿠팡 파트너스 활동"));
  assert.ok(!meta.description.includes(link)); // profile shop flow
  assert.ok(meta.tags.includes("카카오큐레이터"));
});
test("Coupang shorts keep Coupang disclosure", () => {
  const meta = createMetadata({title:"추천"}, {product:{name:"상품",partnerUrl:"https://link.coupang.com/a/test"}});
  assert.ok(meta.description.includes("쿠팡 파트너스 활동"));
  assert.ok(!meta.description.includes(DISCLOSURE));
});
test("Unregistered initial curator images are never silently assumed", () => {
  assert.equal(chooseCuratorProduct(),null);
});
