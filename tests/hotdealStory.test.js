import test from "node:test";
import assert from "node:assert/strict";
import { selectHotdealProducts, createHotdealDirector } from "../modules/hotdeal/director.js";

const product = (group, overrides = {}) => ({
    productGroup: group,
    name: group + " 실제 상품",
    price: 6990,
    unitPrice: 582.5,
    unitLabel: "ml",
    image: "https://example.com/product.jpg",
    url: "https://example.com/item",
    sevenDayLow: null,
    sevenDayStatus: "수집중",
    thirtyDayLow: null,
    thirtyDayStatus: "수집중",
    isHotdeal: false,
    dealRate: null,
    ...overrides
});

test("selection rejects unverifiable items and is limited to two distinct product groups", () => {
    const result = selectHotdealProducts([
        product("생수", { image: "" }),
        product("생수"),
        product("물티슈", { unitPrice: null }),
        product("화장지"),
        product("주방세제")
    ]);
    assert.deepEqual(result.map(x => x.productGroup), ["생수", "화장지"]);
});

test("director never invents discounts or 7-day low prices", async () => {
    const p = product("생수");
    const d = await createHotdealDirector([p], [{ cardFile: "card.png" }]);
    assert.match(d.hook.tts, /묶음 가격/);
    assert.match(d.products[0].tts, /비교 기록이 충분하지 않아/);
    assert.doesNotMatch(d.products[0].tts, /할인율|최저가입니다/);
    assert.equal(d.products[0].cardFile, "card.png");
    assert.equal(d.products.length, 1);
});

test("director uses verified category benchmark as category benchmark only", async () => {
    const p = product("생수", { sevenDayLow: 500, sevenDayStatus: "확정" });
    const d = await createHotdealDirector([p], [{ cardFile: "card.png" }]);
    assert.match(d.products[0].tts, /상품군 7일 최저 단위가격/);
    assert.match(d.products[0].tts, /500,000원/);
});

test("director refuses missing cards or unsupported product facts", async () => {
    await assert.rejects(createHotdealDirector([product("생수")], []));
    await assert.rejects(createHotdealDirector([product("생수", { price: NaN })], [{ cardFile: "x" }]));
});
