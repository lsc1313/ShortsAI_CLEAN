import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR =
    path.resolve(
        "data/coupang"
    );

const DATA_FILE =
    path.join(
        DATA_DIR,
        "products.json"
    );


function ensureStore() {

    if (
        !fs.existsSync(
            DATA_DIR
        )
    ) {

        fs.mkdirSync(
            DATA_DIR,
            {
                recursive: true
            }
        );

    }


    if (
        !fs.existsSync(
            DATA_FILE
        )
    ) {

        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(
                {
                    version: 1,
                    products: []
                },
                null,
                2
            ),
            "utf8"
        );

    }

}


function readStore() {

    ensureStore();


    try {

        const text =
            fs.readFileSync(
                DATA_FILE,
                "utf8"
            );


        const data =
            JSON.parse(
                text
            );


        if (
            !Array.isArray(
                data.products
            )
        ) {

            data.products = [];

        }


        return data;

    }
    catch(error) {

        console.error(
            "[COUPANG] 상품 DB 읽기 실패:",
            error.message
        );


        return {
            version: 1,
            products: []
        };

    }

}


function writeStore(
    data
) {

    ensureStore();


    const tempFile =
        `${DATA_FILE}.tmp`;


    fs.writeFileSync(
        tempFile,
        JSON.stringify(
            data,
            null,
            2
        ),
        "utf8"
    );


    fs.renameSync(
        tempFile,
        DATA_FILE
    );

}


function normalizeText(
    value = ""
) {

    return String(
        value || ""
    )
        .trim()
        .replace(
            /\s+/g,
            " "
        );

}


function normalizeUrl(
    value = ""
) {

    return String(
        value || ""
    ).trim();

}


export function isValidPartnerUrl(
    url = ""
) {

    const value =
        normalizeUrl(
            url
        );


    try {

        const parsed =
            new URL(
                value
            );


        const host =
            parsed.hostname
                .toLowerCase();


        return (
            parsed.protocol === "https:" &&
            (
                host === "link.coupang.com" ||
                host.endsWith(
                    ".link.coupang.com"
                )
            )
        );

    }
    catch {

        return false;

    }

}


export function getProducts(
    options = {}
) {

    const data =
        readStore();


    let products =
        [
            ...data.products
        ];


    if (
        options.enabledOnly === true
    ) {

        products =
            products.filter(
                product =>
                    product.enabled !== false
            );

    }


    return products;

}


export function getProduct(
    id
) {

    const productId =
        normalizeText(
            id
        );


    if (!productId) {

        return null;

    }


    return (
        getProducts().find(
            product =>
                product.id === productId
        ) ||
        null
    );

}


export function findProductByName(
    name
) {

    const target =
        normalizeText(
            name
        ).toLowerCase();


    if (!target) {

        return null;

    }


    const products =
        getProducts();


    /*
        1순위
        완전히 같은 상품명
    */

    const exact =
        products.find(
            product =>
                normalizeText(
                    product.name
                ).toLowerCase() ===
                target
        );


    if (exact) {

        return exact;

    }


    /*
        2순위
        상품명이 주제 안에 포함
        또는 주제가 상품명 안에 포함
    */

    return (
        products.find(
            product => {

                const name =
                    normalizeText(
                        product.name
                    ).toLowerCase();


                if (!name) {

                    return false;

                }


                return (
                    target.includes(
                        name
                    ) ||
                    name.includes(
                        target
                    )
                );

            }
        ) ||
        null
    );

}


export function addProduct(
    input = {}
) {

    const name =
        normalizeText(
            input.name
        );


    const keyword =
        normalizeText(
            input.keyword ||
            input.name
        );


    const partnerUrl =
        normalizeUrl(
            input.partnerUrl
        );


    if (!name) {

        throw new Error(
            "상품명을 입력해주세요."
        );

    }


    if (!partnerUrl) {

        throw new Error(
            "쿠팡 파트너스 링크를 입력해주세요."
        );

    }


    if (
        !isValidPartnerUrl(
            partnerUrl
        )
    ) {

        throw new Error(
            "link.coupang.com 형식의 쿠팡 파트너스 링크만 등록할 수 있습니다."
        );

    }


    const data =
        readStore();


    const duplicate =
        data.products.find(
            product =>
                normalizeUrl(
                    product.partnerUrl
                ) ===
                partnerUrl
        );


    if (duplicate) {

        throw new Error(
            "이미 등록된 쿠팡 파트너스 링크입니다."
        );

    }


    const now =
        new Date()
            .toISOString();


    const product = {

        id:
            `product_${crypto.randomUUID()}`,

        name,

        keyword,

        partnerUrl,

        images:
            Array.isArray(
                input.images
            )
                ? input.images
                    .map(normalizeText)
                    .filter(Boolean)
                : [],

        enabled:
            input.enabled !== false,

        createdAt:
            now,

        updatedAt:
            now

    };


    data.products.push(
        product
    );


    writeStore(
        data
    );


    return product;

}


export function updateProduct(
    id,
    input = {}
) {

    const data =
        readStore();


    const index =
        data.products.findIndex(
            product =>
                product.id === id
        );


    if (
        index === -1
    ) {

        throw new Error(
            "상품을 찾을 수 없습니다."
        );

    }


    const current =
        data.products[index];


    const name =
        input.name !== undefined
            ? normalizeText(
                input.name
            )
            : current.name;


    const keyword =
        input.keyword !== undefined
            ? normalizeText(
                input.keyword
            )
            : current.keyword;


    const partnerUrl =
        input.partnerUrl !== undefined
            ? normalizeUrl(
                input.partnerUrl
            )
            : current.partnerUrl;


    const images =
        input.images !== undefined
            ? (
                Array.isArray(
                    input.images
                )
                    ? input.images
                        .map(normalizeText)
                        .filter(Boolean)
                    : []
            )
            : (
                Array.isArray(
                    current.images
                )
                    ? current.images
                    : []
            );


    if (!name) {

        throw new Error(
            "상품명은 비워둘 수 없습니다."
        );

    }


    if (
        !isValidPartnerUrl(
            partnerUrl
        )
    ) {

        throw new Error(
            "올바른 쿠팡 파트너스 링크가 아닙니다."
        );

    }


    const duplicate =
        data.products.find(
            product =>
                product.id !== id &&
                normalizeUrl(
                    product.partnerUrl
                ) ===
                partnerUrl
        );


    if (duplicate) {

        throw new Error(
            "다른 상품에 이미 등록된 링크입니다."
        );

    }


    const updated = {

        ...current,

        name,

        keyword:
            keyword || name,

        partnerUrl,

        images,

        enabled:
            input.enabled !== undefined
                ? Boolean(
                    input.enabled
                )
                : current.enabled,

        updatedAt:
            new Date()
                .toISOString()

    };


    data.products[index] =
        updated;


    writeStore(
        data
    );


    return updated;

}


export function setProductEnabled(
    id,
    enabled
) {

    return updateProduct(
        id,
        {
            enabled:
                Boolean(
                    enabled
                )
        }
    );

}


export function deleteProduct(
    id
) {

    const data =
        readStore();


    const index =
        data.products.findIndex(
            product =>
                product.id === id
        );


    if (
        index === -1
    ) {

        return false;

    }


    data.products.splice(
        index,
        1
    );


    writeStore(
        data
    );


    return true;

}


export function getEnabledProducts() {

    return getProducts({
        enabledOnly: true
    });

}


export function getProductCount() {

    const products =
        getProducts();


    return {

        total:
            products.length,

        enabled:
            products.filter(
                product =>
                    product.enabled !== false
            ).length

    };

}


export default {

    getProducts,

    getEnabledProducts,

    getProduct,

    findProductByName,

    addProduct,

    updateProduct,

    setProductEnabled,

    deleteProduct,

    getProductCount,

    isValidPartnerUrl

};
