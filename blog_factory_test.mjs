import "dotenv/config";

import {
    getEnabledProducts
} from "./modules/coupang/productStore.js";

import {
    createBlog
} from "./modules/blog/index.js";


console.log(
    "======================================"
);

console.log(
    " BLOG FACTORY TEST"
);

console.log(
    "======================================"
);


const products =
    getEnabledProducts();


console.log(
    `ENABLED PRODUCTS : ${products.length}`
);


if (!products.length) {

    throw new Error(
        "활성화된 쿠팡 상품이 없습니다."
    );

}


const product =
    products[0];


console.log("");
console.log(
    "===== PRODUCT ====="
);

console.log(
    "ID      :",
    product.id
);

console.log(
    "NAME    :",
    product.name
);

console.log(
    "URL     :",
    product.partnerUrl
);

console.log(
    "IMAGES  :",
    Array.isArray(product.images)
        ? product.images.length
        : 0
);


console.log("");
console.log(
    "===== BLOG CREATE ====="
);


const result =
    await createBlog(
        product
    );


console.log("");
console.log(
    "===== RESULT ====="
);

console.log(
    "SUCCESS :",
    result.success
);

console.log(
    "MODE    :",
    result.publish?.mode
);

console.log(
    "TITLE   :",
    result.content?.title
);

console.log(
    "TAGS    :",
    result.content?.tags
);


console.log("");
console.log(
    "===== DESCRIPTION CHECK ====="
);

console.log(
    "PARTNER URL :",
    result.html.includes(
        product.partnerUrl
    )
        ? "OK"
        : "FAIL"
);

console.log(
    "DISCLOSURE  :",
    result.html.includes(
        "쿠팡 파트너스 활동의 일환"
    )
        ? "OK"
        : "FAIL"
);


console.log("");
console.log(
    "===== HTML PREVIEW ====="
);

console.log(
    result.html
);


console.log("");
console.log(
    "======================================"
);

console.log(
    " BLOG FACTORY TEST COMPLETE"
);

console.log(
    "======================================"
);
