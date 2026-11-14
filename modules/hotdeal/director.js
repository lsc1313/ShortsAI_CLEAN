/*
 * Hotdeal information-short director.
 * Facts are constructed from collector data, never invented by an LLM.
 * The public interface remains compatible with createShort.js.
 */
const number = value => value === null || value === undefined || value === "" ? NaN : Number(value);
const won = value => Math.round(Number(value)).toLocaleString("ko-KR") + "원";
const displayUnit = label => {
    const s = String(label || "").trim().toLowerCase();
    if (s === "ml") return { scale: 1000, label: "1리터" };
    if (s === "g") return { scale: 100, label: "100그램" };
    if (s === "매") return { scale: 100, label: "100매" };
    return { scale: 1, label: String(label || "개") };
};
const unitPriceText = product => {
    const unit = displayUnit(product.unitLabel);
    return unit.label + "당 " + won(number(product.unitPrice) * unit.scale);
};
const baseline = (product, period) => {
    const value = number(period === 7 ? product.sevenDayLow : product.thirtyDayLow);
    const status = period === 7 ? product.sevenDayStatus : product.thirtyDayStatus;
    if (!Number.isFinite(value) || value <= 0 || status === "수집중") return null;
    return value;
};
const eligible = p => p && p.image && p.name && p.productGroup &&
    Number.isFinite(number(p.price)) && number(p.price) > 0 &&
    Number.isFinite(number(p.unitPrice)) && number(p.unitPrice) > 0 &&
    String(p.unitLabel || "").trim().length > 0;

/* Pick informative, independently verifiable examples. Never pad a video
 * with unrelated products just to meet a quantity target. */
export function selectHotdealProducts(products = [], max = 2) {
    const seen = new Set();
    return [...products]
        .filter(eligible)
        .filter(p => {
            const key = String(p.productGroup);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .map((p, i) => ({
            p, i,
            score: (baseline(p, 7) !== null ? 8 : 0) +
                (baseline(p, 30) !== null ? 5 : 0) +
                (p.isHotdeal === true && number(p.dealRate) > 0 ? 3 : 0)
        }))
        .sort((a, b) => b.score - a.score || a.i - b.i)
        .slice(0, Math.max(1, max))
        .map(x => x.p);
}

const advice = group => {
    const name = String(group || "");
    if (/생수|음료/.test(name)) return "묶음 가격보다 1리터당 가격을 확인하세요.";
    if (/화장지|휴지/.test(name)) return "롤 수뿐 아니라 롤 길이와 겹수도 확인하세요.";
    if (/물티슈/.test(name)) return "매수만 보지 말고 한 장 크기와 두께도 확인하세요.";
    if (/샴푸|린스|컨디셔너|바디워시|세제/.test(name)) return "용량을 맞춰 단위가격으로 비교하세요.";
    if (/즉석밥/.test(name)) return "한 개 용량을 맞춘 뒤 개당 가격을 비교하세요.";
    if (/치약/.test(name)) return "그램당 가격과 제품 종류를 함께 확인하세요.";
    return "구성과 규격을 맞춘 뒤 단위가격으로 비교하세요.";
};

export async function createHotdealDirector(products = [], cards = []) {
    if (!Array.isArray(products) || !products.length)
        throw new Error("HOTDEAL: 상품 데이터가 없습니다.");
    if (!Array.isArray(cards) || cards.length !== products.length ||
        cards.some(c => !c?.cardFile))
        throw new Error("HOTDEAL: 실제 상품 카드가 누락되었습니다.");
    if (products.some(p => !eligible(p)))
        throw new Error("HOTDEAL: 이미지·가격·단위정보가 검증되지 않은 상품이 있습니다.");

    const first = products[0];
    const hookText = first.productGroup + ", 묶음 가격만 보면 정말 저렴한 걸까요?";
    const output = products.map((p, index) => {
        const current = number(p.unitPrice);
        const historical = baseline(p, 7);
        const unit = displayUnit(p.unitLabel);
        // 7-day figures are category unit-price observations, not a discount
        // or a historical price for this individual SKU.
        const comparison = historical === null
            ? "아직 7일 비교 기록이 충분하지 않아 최저가 판단은 보류합니다."
            : current <= historical + 0.00001
                ? "수집된 같은 상품군의 7일 최저 단위가격 수준입니다."
                : "수집된 같은 상품군 7일 최저 단위가격은 " +
                    won(historical * unit.scale) + "입니다.";
        const message = p.productGroup + "의 현재 가격은 " + won(p.price) +
            ". " + unitPriceText(p) + "입니다. " + comparison;
        const tip = advice(p.productGroup);
        return {
            order: index + 1, productGroup: p.productGroup,
            name: p.name, price: p.price, unitPrice: p.unitPrice,
            unitLabel: p.unitLabel, image: p.image, url: p.url,
            sevenDayLow: p.sevenDayLow, sevenDayStatus: p.sevenDayStatus,
            thirtyDayLow: p.thirtyDayLow, thirtyDayStatus: p.thirtyDayStatus,
            dealRate: p.dealRate, isHotdeal: p.isHotdeal === true,
            cardFile: cards[index].cardFile,
            displayDuration: 8, scrollDuration: 8, scrollSpeed: "slow",
            tts: message + " " + tip,
            subtitle: p.productGroup + " | " + unitPriceText(p),
            showHotdeal: p.isHotdeal === true
        };
    });
    const last = products[products.length - 1];
    const endingText = "결론! " + advice(first.productGroup) +
        (products.length > 1 ? " " + last.productGroup + "도 같은 기준으로 확인해 보세요." : "") +
        " 상품 정보는 프로필에서 확인하세요.";
    return {
        title: first.productGroup + " 살 때 총가격만 보면 놓치는 것 #쇼핑팁 #가격비교",
        description: "가격은 수집 시점 기준이며 변동될 수 있습니다. 단위가격과 상품 규격을 함께 확인하세요.",
        format: { aspectRatio: "9:16", orientation: "vertical" },
        video: { targetDuration: 28, layout: "information_short", scrollDirection: "top_to_bottom", scrollMode: "cut" },
        hook: { tts: hookText, subtitle: hookText, duration: 2.5 },
        products: output,
        ending: { tts: endingText, subtitle: "총가격보다 단위가격 + 규격", duration: 4 }
    };
}
