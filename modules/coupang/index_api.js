import crypto from "crypto";
import axios from "axios";

function auth(method, path){

    const datetime =
        new Date().toISOString().replace(/[-:]/g,"").replace(/\..+/,"")+"Z";

    const message =
        `${datetime}${method}${path}`;

    const signature =
        crypto
        .createHmac(
            "sha256",
            process.env.COUPANG_SECRET_KEY
        )
        .update(message)
        .digest("hex");

    return {
        Authorization:
            `CEA algorithm=HmacSHA256, access-key=${process.env.COUPANG_ACCESS_KEY}, signed-date=${datetime}, signature=${signature}`
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
