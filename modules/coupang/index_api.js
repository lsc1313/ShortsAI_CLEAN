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

export async function searchProduct(keyword){

    const path =
        `/v2/providers/affiliate_open_api/apis/openapi/products/search?keyword=${encodeURIComponent(keyword)}&limit=1`;

    const res =
        await axios.get(
            `https://api-gateway.coupang.com${path}`,
            {
                headers:auth("GET",path)
            }
        );

    const product =
        res.data.data?.productData?.[0];

    if(!product) return null;

    return {
        title:
            product.productName,
        price:
            product.productPrice,
        image:
            product.productImage,
        url:
            product.productUrl
    };

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
