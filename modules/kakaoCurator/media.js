import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { downloadImage } from "../image/download.js";
import { isCuratorLink, saveCuratorProduct } from "./store.js";

function extractOgImage(html) {
    const tags = String(html || "").match(/<meta\b[^>]*>/gi) || [];
    for (const tag of tags) {
        if (!/(?:property|name)\s*=\s*["'](?:og:image|twitter:image)["']/i.test(tag)) continue;
        const m = tag.match(/content\s*=\s*["']([^"']+)["']/i);
        if (m && m[1]) return m[1].replace(/&amp;/g, "&");
    }
    return null;
}

/* Public preview only: link belongs to the user, but access may require
 * a Kakao authenticated session. Fail closed when no authoritative image. */
export async function enrichCuratorProduct(product) {
    if (!isCuratorLink(product.partnerUrl)) throw new Error("Invalid curator link");
    if (product.images?.length) return product;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
        const response = await fetch(product.partnerUrl, {
            signal: controller.signal,
            headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html" }
        });
        if (!response.ok) return product;
        const html = await response.text();
        const image = extractOgImage(html);
        if (!image) return product;
        const parsed = new URL(image, response.url);
        if (parsed.protocol !== "https:") return product;
        // Never claim that this is a verified SKU image: this is a page preview.
        const result = saveCuratorProduct({ ...product, images: [parsed.href] });
        return result;
    } catch { return product; } finally { clearTimeout(timeout); }
}
export async function prepareCuratorProduct(product) {
    const p = await enrichCuratorProduct(product);
    if (!Array.isArray(p.images) || p.images.length === 0)
        throw new Error("큐레이터 상품 이미지가 없습니다. 상품 이미지를 등록해야 자동 업로드할 수 있습니다.");
    const dir = path.resolve("media/products/kakao-curator", crypto.createHash("sha256").update(p.partnerUrl).digest("hex").slice(0,16));
    fs.mkdirSync(dir, {recursive:true});
    const local = [];
    for (const [i, source] of p.images.slice(0, 6).entries()) {
        const file = path.join(dir, "product_" + (i + 1) + ".jpg");
        if (source.startsWith("https://")) await downloadImage(source, file);
        else {
            const resolved = path.resolve(source);
            if (!resolved.startsWith(path.resolve("media", "products") + path.sep))
                throw new Error("큐레이터 로컬 이미지는 media/products 폴더에 있어야 합니다.");
            fs.copyFileSync(resolved, file);
        }
        if (!fs.existsSync(file) || fs.statSync(file).size < 1000)
            throw new Error("큐레이터 이미지 다운로드에 실패했습니다.");
        local.push(file);
    }
    return { ...p, images: local, publicImages: p.images };
}
