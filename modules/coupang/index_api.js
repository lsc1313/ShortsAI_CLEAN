import axios from "axios";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const {
    ACCESS_KEY,
    SECRET_KEY
} = require("../../coupang-hotdeal/config.js");

const {
    generateHmac
} = require("../../coupang-hotdeal/hmacGenerator.js");

function auth(method, path) {

    return {
        Authorization:
            generateHmac(
                method,
                path,
                SECRET_KEY,
                ACCESS_KEY
            )
    };
}

export async function searchProducts(keyword, limit = 10) {
    const safeLimit = Math.min(10, Math.max(1, Math.trunc(Number(limit) || 10)));
    const query = String(keyword || "").trim();
    if (!query) return [];

    const requestPath =
        `/v2/providers/affiliate_open_api/apis/openapi/products/search?keyword=${encodeURIComponent(query)}&limit=${safeLimit}`;

    const res = await axios.get(
        `https://api-gateway.coupang.com${requestPath}`,
        { headers: auth("GET", requestPath), timeout: 15000 }
    );

    const rows = res.data?.data?.productData;
    if (!Array.isArray(rows)) return [];
    const used = new Set();

    return rows.map(product => ({
        productId: String(product.productId || "").trim(),
        title: String(product.productName || "").trim(),
        price: Number(product.productPrice || 0),
        image: String(product.productImage || "").trim(),
        url: String(product.productUrl || "").trim()
    })).filter(product => {
        if (!product.title || !product.url || !product.image || !(product.price > 0)) return false;
        const id = product.productId || product.url;
        if (used.has(id)) return false;
        used.add(id);
        return true;
    });
}

// Preserve the previous single-result API for callers relying on it.
export async function searchProduct(keyword) {
    return (await searchProducts(keyword, 1))[0] || null;
}

export async function createPartnerLink(url){

    const path =
        "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink";

    const res =
        await axios.post(
            `https://api-gateway.coupang.com${path}`,
            {
                coupangUrls:[url]
            },
            {
                headers:{
                    ...auth("POST",path),
                    "Content-Type":"application/json"
                }
            }
        );

    return res.data.data?.[0]?.shortenUrl ||
           res.data.data?.[0]?.landingUrl ||
           url;

}
