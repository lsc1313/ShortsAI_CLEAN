import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { deployPages } from "../cloudflare/pagesDeploy.js";

const CLOUDFLARE_ACCOUNT_ID = "077453530769859915f71686765e42ef";
const CLOUDFLARE_PROJECT = "shortsai-shop";
const CLOUDFLARE_TOKEN_FILE = path.resolve(".runtime/cloudflare/api_token");

export async function updateShopPage(newProducts = []) {
    console.log("[SHOP UPDATER] 핫딜 업데이트 실행 중...");
    const htmlPath = path.resolve("public/shop/index.html");

    if (!fs.existsSync(htmlPath)) return;
    let html = fs.readFileSync(htmlPath, "utf8");

    // 핫딜 카드 HTML 생성
    const hotdealCards = newProducts.map((p, idx) => {
        const badge = idx === 0 ? '<span class="latest-badge">오늘의 핫딜</span>' : "";
        const pLink = p.link || p.url || p.affiliateUrl || "#";
        const pImg = p.image || p.img || p.imageUrl || "";
        const pName = p.name || p.title || "핫딜 상품";

        return `<a class="product-card" href="${pLink}" target="_blank" rel="nofollow sponsored">
        ${badge}
        <div class="product-image">
            <img src="${pImg}" alt="${pName}" loading="lazy">
        </div>
        <div class="product-name">${pName}</div>
    </a>`;
    }).join("\n");

    // HOTDEAL 주석 구간 교체
    const startMark = "<!-- HOTDEAL_START -->";
    const endMark = "<!-- HOTDEAL_END -->";

    if (html.includes(startMark) && html.includes(endMark)) {
        const top = html.split(startMark)[0];
        const bottom = html.split(endMark)[1];
        html = top + startMark + "\n" + hotdealCards + "\n" + endMark + bottom;
        fs.writeFileSync(htmlPath, html, "utf8");
    }

    // Cloudflare 배포
    if (!fs.existsSync(CLOUDFLARE_TOKEN_FILE)) return;
    const apiToken = fs.readFileSync(CLOUDFLARE_TOKEN_FILE, "utf8").trim();

    try {
        await deployPages({
            directory: path.resolve("public/shop"),
            accountId: CLOUDFLARE_ACCOUNT_ID,
            apiToken: apiToken,
            project: CLOUDFLARE_PROJECT,
            branch: "main"
        });
        console.log("[SHOP UPDATER] 배포 완료!");
    } catch (e) {
        console.error("[SHOP UPDATER] 배포 중 오류:", e.message);
    }
}
