import fs from "fs";
import path from "path";
import axios from "axios";
import { execSync } from "child_process";

const CARD_DIR = path.resolve(
    "coupang-hotdeal",
    "data",
    "cards"
);

const SOURCE_DIR = path.join(
    CARD_DIR,
    "source"
);

function ensureDir() {

    fs.mkdirSync(
        SOURCE_DIR,
        {
            recursive: true
        }
    );

}

function escapeXml(value = "") {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

}

function formatPrice(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "";
    }

    return Math.round(number).toLocaleString("ko-KR") + "원";

}

function getDisplayUnit(unitLabel) {
    const label = String(unitLabel || "").toLowerCase();

    // 내부 비교값은 1g/1ml/1매 기준으로 유지하고,
    // 사람에게 보여줄 때만 읽기 쉬운 묶음 단위로 바꾼다.
    if (label === "g") return { multiplier: 100, label: "100g" };
    if (label === "ml") return { multiplier: 1000, label: "1L" };
    if (label === "매") return { multiplier: 100, label: "100매" };

    return { multiplier: 1, label: unitLabel };
}

function formatUnitPrice(unitPrice, unitLabel) {
    const value = Number(unitPrice);
    if (!Number.isFinite(value)) return "";

    const display = getDisplayUnit(unitLabel);
    const price = Math.round(value * display.multiplier);

    return `${price.toLocaleString("ko-KR")}원/${display.label}`;
}

async function downloadImage(url, file) {
    if (!url) return false;
    try {
        let fetchUrl = String(url).trim();
        if (fetchUrl.startsWith("//")) fetchUrl = "https:" + fetchUrl;
        
        // URL에서 쿼리스트링 정제 및 고화질 원본 이미지 주소 확보
        // Keep signed image URL query parameters; removing them can cause 403 responses.

        if (fetchUrl.startsWith("http://") || fetchUrl.startsWith("https://")) {
            const response = await axios.get(fetchUrl, {
                responseType: "arraybuffer",
                timeout: 15000,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Referer": "https://www.coupang.com/",
                    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
                }
            });
            if (response.data && response.data.length > 500) {
                fs.writeFileSync(file, response.data);
                return true;
            }
        } else if (fs.existsSync(fetchUrl)) {
            fs.copyFileSync(fetchUrl, file);
            return true;
        }
    } catch (e) {
        console.error("[CARD IMG DOWNLOAD ERROR]", url, e.message);
    }
    return false;
};;;

function createCardSvg(product, imageFile) {
    const group = escapeXml(product.productGroup || "생활용품");
    const name = escapeXml(String(product.name || "").slice(0, 32));
    const total = escapeXml(formatPrice(product.price));
    const unit = escapeXml(formatUnitPrice(product.unitPrice, product.unitLabel));
    const hasSevenDay = product.sevenDayStatus !== "수집중" &&
        product.sevenDayLow !== null && product.sevenDayLow !== undefined &&
        Number.isFinite(Number(product.sevenDayLow)) && Number(product.sevenDayLow) > 0;
    const history = hasSevenDay
        ? "상품군 7일 최저 단위가격 " + formatUnitPrice(product.sevenDayLow, product.unitLabel)
        : "7일 가격기록 수집 중";
    const deal = product.isHotdeal === true && Number(product.dealRate) > 0
        ? '<rect x="76" y="132" rx="23" width="210" height="65" fill="#e4494f"/><text x="181" y="176" text-anchor="middle" font-family="Noto Sans KR" font-size="30" font-weight="800" fill="#fff">핫딜 확인</text>'
        : "";
    return `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="1080" height="1920" viewBox="0 0 1080 1920">
    <rect width="1080" height="1920" fill="#101725"/>
    <rect x="56" y="67" width="968" height="1760" rx="48" fill="#192337"/>
    <text x="84" y="132" font-family="Noto Sans KR" font-size="40" fill="#a1f6d0" font-weight="700">가격표 다시 보기 / ${group}</text>
    <text x="84" y="275" font-family="Noto Sans KR" font-size="66" fill="#ffffff" font-weight="800">묶음 가격만 보지 마세요</text>
    <text x="84" y="351" font-family="Noto Sans KR" font-size="37" fill="#cad6e5">진짜 비교는 단위가격부터</text>
    <rect x="78" y="402" width="924" height="770" rx="42" fill="#fff"/>
    <image x="105" y="432" width="870" height="710" preserveAspectRatio="xMidYMid meet"
           href="${imageFile}" xlink:href="${imageFile}"/>
    ${deal}
    <text x="84" y="1265" font-family="Noto Sans KR" font-size="40" fill="#e1e8f3" font-weight="600">${name}</text>
    <text x="84" y="1370" font-family="Noto Sans KR" font-size="37" fill="#a7b6c9">총 구매가격  ${total}</text>
    <rect x="78" y="1430" rx="28" width="924" height="180" fill="#a1f6d0"/>
    <text x="112" y="1490" font-family="Noto Sans KR" font-size="35" fill="#15253a" font-weight="700">비교할 숫자</text>
    <text x="112" y="1570" font-family="Noto Sans KR" font-size="67" fill="#101725" font-weight="900">${unit}</text>
    <text x="84" y="1698" font-family="Noto Sans KR" font-size="30" fill="#b9c6d7">${escapeXml(history)}</text>
    <text x="84" y="1780" font-family="Noto Sans KR" font-size="27" fill="#899bb2">같은 규격·구성인지 구매 전 확인</text>
</svg>`;
}

function renderSvg(svgFile, pngFile) {
    
    execSync(
        `magick -background none -density 300 "${svgFile}" "${pngFile}"`,
        { stdio: "ignore" }
    );
}

export async function createHotdealCards(
    products = []
) {

    if (
        !Array.isArray(products) ||
        products.length === 0
    ) {

        throw new Error(
            "HOTDEAL CARD: 상품 데이터가 없습니다."
        );

    }

    ensureDir();

    const cards = [];

    for (
        let index = 0;
        index < products.length;
        index++
    ) {

        const product =
            products[index];

        const order =
            index + 1;

        const base =
            `card_${String(order).padStart(2, "0")}`;

        const sourceImage =
            path.join(
                SOURCE_DIR,
                `${base}.img`
            );

        const svgFile =
            path.join(
                CARD_DIR,
                `${base}.svg`
            );

        const pngFile =
            path.join(
                CARD_DIR,
                `${base}.png`
            );

        const imgOk = await downloadImage(product.image, sourceImage);
        if (!imgOk || !fs.existsSync(sourceImage) || fs.statSync(sourceImage).size < 500) {
            throw new Error(`[HOTDEAL] 실제 상품 이미지 확보 실패: ${product.name}`);
        }

        let imageAttr = sourceImage;
        if (fs.existsSync(sourceImage) && fs.statSync(sourceImage).size > 500) {
            const imgBuffer = fs.readFileSync(sourceImage);
            const base64Str = imgBuffer.toString("base64");
            
            // 파일 첫 바이트(Magic Byte) 기준 MIME 타입 자동 감지
            let mimeType = "image/jpeg";
            if (imgBuffer[0] === 0x89 && imgBuffer[1] === 0x50) mimeType = "image/png";
            else if (imgBuffer[0] === 0x52 && imgBuffer[1] === 0x49) mimeType = "image/webp";
            
            imageAttr = `data:${mimeType};base64,${base64Str}`;
        }
        const svg = createCardSvg(product, imageAttr);

        fs.writeFileSync(
            svgFile,
            svg,
            "utf8"
        );

        renderSvg(svgFile, pngFile);

        if (
            !fs.existsSync(pngFile) ||
            fs.statSync(pngFile).size < 10000
        ) {

            throw new Error(
                `HOTDEAL CARD 생성 실패: ${base}.png`
            );

        }

        cards.push({

            order,

            productGroup:
                product.productGroup,

            name:
                product.name,

            price:
                product.price,

            unitPrice:
                product.unitPrice,

            unitLabel:
                product.unitLabel,

            highestPrice:
                product.highestPrice,

            dealRate:
                product.dealRate,

            isHotdeal:
                product.isHotdeal,

            sevenDayLow:
                product.sevenDayLow,

            sevenDayStatus:
                product.sevenDayStatus,

            thirtyDayLow:
                product.thirtyDayLow,

            thirtyDayStatus:
                product.thirtyDayStatus,

            image:
                product.image,

            url:
                product.url,

            cardFile:
                pngFile

        });

        console.log(
            `[HOTDEAL CARD] ${order}/${products.length} 생성 완료`
        );

    }

    return cards;

}
