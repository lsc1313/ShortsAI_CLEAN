import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Daily Coupang process checks several products before selecting one", () => {
  const scheduler=fs.readFileSync(new URL("../automation/masterScheduler.js",import.meta.url),"utf8");
  assert.match(scheduler,/selectShoppingRecommendationCandidates\(5\)/);
  assert.match(scheduler,/await prepareShoppingProduct\(product\)/);
  assert.match(scheduler,/distinctPhotos: prepared\.images\.length/);
});
test("Daily successful upload is verified before recommending again", () => {
  const scheduler=fs.readFileSync(new URL("../automation/masterScheduler.js",import.meta.url),"utf8");
  const portion=scheduler.slice(scheduler.indexOf("async function runShoppingRecommendationJob"),scheduler.indexOf("async function runChannelJob"));
  assert.ok(portion.indexOf("rememberRecommendedProduct(")>portion.indexOf("const status = Brain.getStatus();"));
  assert.match(portion,/status\.current \|\| 0\) < 1/);
});
test("The scheduler reports incomplete jobs rather than complete 0 of 1", () => {
  const scheduler=fs.readFileSync(new URL("../automation/masterScheduler.js",import.meta.url),"utf8");
  assert.match(scheduler,/SCHEDULER_INCOMPLETE/);
});
test("Candidate API remains compatible with old one-item caller",()=>{
  const module=fs.readFileSync(new URL("../automation/shoppingRecommendation.js",import.meta.url),"utf8");
  assert.match(module,/export async function selectShoppingRecommendationCandidates/);
  assert.match(module,/export async function selectShoppingRecommendation\(\)/);
});
