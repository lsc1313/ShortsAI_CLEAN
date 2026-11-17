import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {extractRedirectWebUrl} from "../modules/coupang/productResolver.js";

const target="https://m.coupang.com/vm/products/9710180536?productId=9710180536&itemId=29052191811";
test("Coupang redirect extractor handles original quoted JS assignment",()=>{
  assert.equal(extractRedirectWebUrl("var redirectWebUrl='"+target+"';"),target);
});
test("Coupang redirect extractor handles JSON string format",()=>{
  assert.equal(extractRedirectWebUrl(JSON.stringify({redirectWebUrl:target})),target);
});
test("Coupang redirect extractor handles escaped slashes and URL encoding",()=>{
  const escaped=target.replaceAll("/","\\/");
  assert.equal(extractRedirectWebUrl('{"redirectWebUrl":"'+escaped+'"}'),target);
});
test("Coupang redirect rejects arbitrary websites and HTTP",()=>{
  assert.equal(extractRedirectWebUrl('{"redirectWebUrl":"https://evil.example.net/abc"}'),"");
  assert.equal(extractRedirectWebUrl('{"redirectWebUrl":"http://m.coupang.com/abc"}'),"");
});
test("Image acquisition reports measurable failures instead of silently swallowing",()=>{
  const s=fs.readFileSync(new URL("../modules/shopping/productMedia.js",import.meta.url),"utf8");
  assert.match(s,/SHOPPING IMAGE DIAGNOSTICS/);
  assert.match(s,/duplicate-image-bytes/);
  assert.match(s,/http-\$\{status\}/);
  assert.match(s,/candidateCount/);
  assert.match(s,/successfulDistinctImages/);
});
test("UI keyword flow logs failures of detailed product resolver without access tokens",()=>{
  const s=fs.readFileSync(new URL("../modules/shopping/quickCoupang.js",import.meta.url),"utf8");
  assert.match(s,/COUPANG GALLERY/);
  assert.match(s,/COUPANG IMAGE SOURCE/);
  assert.doesNotMatch(s,/console\.log\([^)]*partnerUrl/);
});
