import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const FILE = path.resolve("data/kakao-curator/products.json");
export const DISCLOSURE = "이 포스팅은 선물하기 큐레이터 활동의 일환으로, 주문 발생 시 일정액의 수수료를 제공 받습니다.";

export function isCuratorLink(value) {
    try {
        const u = new URL(String(value || ""));
        return u.protocol === "https:" && u.hostname === "gift-link.kakao.com" &&
            /^\/c\/[A-Za-z0-9_-]+\/?$/.test(u.pathname);
    } catch { return false; }
}

function normalize(input) {
    const link = String(input.partnerUrl || input.url || "").trim();
    if (!isCuratorLink(link)) throw new Error("gift-link.kakao.com/c/... 큐레이터 원본 링크가 필요합니다.");
    const name = String(input.name || "").trim();
    if (!name || name.length > 300) throw new Error("검증된 상품명을 입력하세요.");
    const images = (Array.isArray(input.images) ? input.images : [input.image])
        .filter(Boolean).map(x => String(x).trim()).filter(x =>
            /^https:\/\//i.test(x) || /^(media|data)\/[a-z0-9_./-]+$/i.test(x)
        ).slice(0, 6);
    return {
        id: String(input.id || crypto.randomUUID()),
        name,
        keyword: String(input.keyword || name),
        description: String(input.description || ""),
        price: Number.isFinite(Number(input.price)) && Number(input.price) > 0 ? Number(input.price) : null,
        partnerUrl: link,
        provider: "kakao-curator",
        images,
        enabled: input.enabled !== false,
        createdAt: input.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

export function listCuratorProducts() {
    try {
        const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
        return Array.isArray(data.products) ? data.products : [];
    } catch (e) {
        if (e.code === "ENOENT") return [];
        throw e;
    }
}
function write(products) {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const temp = FILE + ".tmp";
    fs.writeFileSync(temp, JSON.stringify({ version: 1, products }, null, 2));
    fs.renameSync(temp, FILE);
}
export function saveCuratorProduct(input) {
    const products = listCuratorProducts();
    const previous = products.find(p => p.partnerUrl === (input.partnerUrl || input.url));
    const next = normalize({ ...previous, ...input });
    const index = products.findIndex(p => p.id === next.id);
    if (index === -1) products.push(next);
    else products[index] = next;
    write(products);
    return next;
}
export function removeCuratorProduct(id) {
    const products = listCuratorProducts();
    if (!products.some(p => p.id === id)) return false;
    write(products.filter(p => p.id !== id));
    return true;
}
export function validCuratorProduct(p) {
    return Boolean(p?.enabled !== false && isCuratorLink(p?.partnerUrl) &&
        String(p.name || "").trim() &&
        Array.isArray(p.images) && p.images.length);
}

const HISTORY = path.resolve("data/kakao-curator/published.json");
function getHistory() {
    try { return JSON.parse(fs.readFileSync(HISTORY, "utf8")); } catch { return {}; }
}
export function chooseCuratorProduct(now = new Date()) {
    const history = getHistory();
    const cutoff = now.getTime() - 7 * 86400000;
    return listCuratorProducts()
        .filter(validCuratorProduct)
        .filter(p => !(Date.parse(history[p.partnerUrl]) >= cutoff))
        .sort((a,b) => (Date.parse(history[a.partnerUrl]) || 0) - (Date.parse(history[b.partnerUrl]) || 0))[0] || null;
}
export function markCuratorPublished(p, now = new Date()) {
    const history = getHistory();
    history[p.partnerUrl] = now.toISOString();
    fs.mkdirSync(path.dirname(HISTORY), {recursive:true});
    const tmp = HISTORY + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(history, null, 2));
    fs.renameSync(tmp,HISTORY);
}
