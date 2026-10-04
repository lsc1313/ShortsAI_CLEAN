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

function formatUnitPrice(
    unitPrice,
    unitLabel
) {

    const value =
        Number(unitPrice);

    if (!Number.isFinite(value)) {
        return "";
    }

    return `${Math.round(value).toLocaleString("ko-KR")}원/${unitLabel}`;

}

async function downloadImage(url, file) {
    if (!url) return false;
    try {
        let fetchUrl = String(url).trim();
        if (fetchUrl.startsWith("//")) fetchUrl = "https:" + fetchUrl;
        
        // URL에서 쿼리스트링 정제 및 고화질 원본 이미지 주소 확보
        fetchUrl = fetchUrl.split("?")[0];

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

function createCardSvg(
    product,
    imageFile
) {

    const productGroup =
        escapeXml(
            product.productGroup || ""
        );

    const name =
        escapeXml(
            product.name || ""
        );

    const price =
        escapeXml(
            formatPrice(product.price)
        );

    const unitPrice =
        escapeXml(
            formatUnitPrice(
                product.unitPrice,
                product.unitLabel
            )
        );

    const sevenDay =
        product.sevenDayStatus === "수집중"
            ? "7일 최저가  수집중"
            : `7일 최저  ${formatUnitPrice(product.sevenDayLow, product.unitLabel)}`;

    const thirtyDay =
        product.thirtyDayStatus === "수집중"
            ? "30일 최저가  수집중"
            : `30일 최저  ${formatUnitPrice(product.thirtyDayLow, product.unitLabel)}`;

    const hotdeal =
        product.isHotdeal === true
            ? `
                <rect x="70" y="180" width="250" height="72" rx="36"
                    fill="#E53935"/>
                <text x="195" y="229"
                    text-anchor="middle"
                    font-family="Noto Sans KR"
                    font-size="34"
                    font-weight="700"
                    fill="white">HOT DEAL</text>
              `
            : "";

    const href = imageFile;

    return `
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="1080"
     height="1920"
     viewBox="0 0 1080 1920">

    <rect width="1080" height="1920" fill="#F7F7F7"/>

    <rect x="45" y="45"
          width="990"
          height="1830"
          rx="48"
          fill="white"/>

    <image x="90" y="180" width="900" height="900" preserveAspectRatio="xMidYMid meet" href="${href}"/>

    <text x="70" y="135"
          font-family="Noto Sans KR"
          font-size="58"
          font-weight="700"
          fill="#111111">${productGroup}</text>

    ${hotdeal}

    <rect x="70" y="290"
          width="940"
          height="760"
          rx="36"
          fill="#F3F3F3"/>

    <image
        x="110"
        y="330"
        width="860"
        height="680"
        preserveAspectRatio="xMidYMid meet"
        href="${href}"
        xlink:href="${href}"/>

    <text x="70" y="1140"
          font-family="Noto Sans KR"
          font-size="42"
          font-weight="700"
          fill="#222222">${name}</text>

    <text x="70" y="1270"
          font-family="Noto Sans KR"
          font-size="74"
          font-weight="800"
          fill="#111111">${price}</text>

    <text x="70" y="1360"
          font-family="Noto Sans KR"
          font-size="50"
          font-weight="700"
          fill="#333333">${unitPrice}</text>

    <line x1="70" y1="1420"
          x2="1010" y2="1420"
          stroke="#DDDDDD"
          stroke-width="3"/>

    <text x="70" y="1500"
          font-family="Noto Sans KR"
          font-size="38"
          font-weight="600"
          fill="#444444">${escapeXml(sevenDay)}</text>

    <text x="70" y="1570"
          font-family="Noto Sans KR"
          font-size="38"
          font-weight="600"
          fill="#444444">${escapeXml(thirtyDay)}</text>

    ${
        product.dealRate > 0
            ? `
            <text x="70" y="1660"
                  font-family="Noto Sans KR"
                  font-size="42"
                  font-weight="800"
                  fill="#E53935">
                ${escapeXml(
                    `할인율 ${product.dealRate}%`
                )}
            </text>
            `
            : ""
    }

    <text x="70" y="1780"
          font-family="Noto Sans KR"
          font-size="30"
          fill="#888888">
        오늘의 가격비교
    </text>

</svg>
`;

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
            console.warn(`[WARN] ${product.name} 이미지 다운로드 실패 - 대체 처리`);
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
