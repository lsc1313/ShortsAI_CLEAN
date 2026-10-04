import { createRequire } from "module";

import {
    isRecommendedProduct,
    getRecentRecommendations
} from "./shoppingRecommendationDB.js";

const require =
    createRequire(
        import.meta.url
    );

const Hotdeal =
    require("../coupang-hotdeal/index.js");


/*
=========================================================
SHOPPING RECOMMENDATION

12:00 쇼핑 추천템 전용

역할

1. 오늘 사용할 쇼핑 검색 주제 결정
2. 쿠팡에서 상품 후보 검색
3. 과거 추천 상품 중복 제거
4. 최종 추천상품 1개 반환

주의

- 여기서는 쇼츠를 제작하지 않는다.
- 여기서는 중복 DB에 기록하지 않는다.
- 실제 업로드 성공 후에만 별도로 기록한다.
=========================================================
*/


const SEARCH_TOPICS = [

    "자취 꿀템",
    "주방 아이디어템",
    "디지털 꿀템",
    "차량용 꿀템",
    "여행 꿀템",
    "직장인 꿀템",
    "육아 꿀템",
    "반려동물 꿀템",
    "캠핑 꿀템",
    "운동 꿀템",
    "정리 아이디어템",
    "SNS 화제템",
    "신기한 아이템",
    "아이디어 상품"

];


/*
=========================================================
검색 주제 선택

최근 추천 기록의 searchTopic을 확인해서
가능하면 바로 직전에 사용한 주제는 피한다.

현재 단계에서는 복잡한 AI 선정기를 붙이지 않는다.

상품 후보 검색과 중복방지가 정상 동작하는 것을
먼저 확인한 뒤 검색 주제 AI를 연결한다.
=========================================================
*/

function chooseSearchTopic() {

    const recent =
        getRecentRecommendations();

    const lastTopic =
        String(
            recent?.[0]?.searchTopic || ""
        ).trim();

    const candidates =
        SEARCH_TOPICS.filter(
            topic =>
                topic !== lastTopic
        );

    const pool =
        candidates.length > 0
            ? candidates
            : SEARCH_TOPICS;

    const index =
        Math.floor(
            Math.random() *
            pool.length
        );

    return pool[index];
}


/*
=========================================================
쿠팡 후보 검색
=========================================================
*/

async function searchCandidates(
    searchTopic,
    limit = 10
) {

    const products =
        await Hotdeal.searchProductInfo(
            searchTopic,
            limit
        );

    if (!Array.isArray(products)) {
        return [];
    }

    return products
        .map(product => ({

            productId:
                String(
                    product?.productId || ""
                ).trim(),

            name:
                String(
                    product?.productName || ""
                ).trim(),

            price:
                Number(
                    product?.productPrice || 0
                ),

            image:
                String(
                    product?.productImage || ""
                ).trim(),

            url:
                String(
                    product?.productUrl || ""
                ).trim()

        }))
        .filter(product =>
            product.productId &&
            product.name &&
            Number.isFinite(product.price) &&
            product.price > 0 &&
            product.image &&
            product.url
        );
}


/*
=========================================================
중복 제거

1순위
productId

2순위
정규화된 상품명

shoppingRecommendationDB 내부의
isRecommendedProduct()가 두 검사를 처리한다.
=========================================================
*/

function removeDuplicates(
    products = []
) {

    const results = [];

    const currentIds =
        new Set();

    const currentNames =
        new Set();

    for (const product of products) {

        const productId =
            String(
                product.productId || ""
            ).trim();

        const nameKey =
            String(
                product.name || ""
            )
                .normalize("NFKC")
                .toLowerCase()
                .replace(
                    /[^0-9a-zA-Z가-힣]/g,
                    ""
                );

        if (
            currentIds.has(productId) ||
            currentNames.has(nameKey)
        ) {
            continue;
        }

        if (
            isRecommendedProduct({
                productId,
                productName:
                    product.name
            })
        ) {
            continue;
        }

        currentIds.add(
            productId
        );

        currentNames.add(
            nameKey
        );

        results.push(
            product
        );
    }

    return results;
}


/*
=========================================================
추천상품 선정

현재는 쿠팡 검색 결과에서
중복 제거 후 가장 앞에 남은 상품을 사용한다.

다음 단계에서 AI 상품 선별기를 붙인다.
=========================================================
*/

export async function selectShoppingRecommendation() {

    const searchTopic =
        chooseSearchTopic();

    console.log("");
    console.log(
        "========================================="
    );
    console.log(
        " SHOPPING RECOMMENDATION"
    );
    console.log(
        "========================================="
    );

    console.log(
        `[SHOPPING RECOMMENDATION] 검색주제 : ${searchTopic}`
    );

    const candidates =
        await searchCandidates(
            searchTopic,
            10
        );

    console.log(
        `[SHOPPING RECOMMENDATION] 검색후보 : ${candidates.length}`
    );

    const available =
        removeDuplicates(
            candidates
        );

    console.log(
        `[SHOPPING RECOMMENDATION] 중복제거 후 : ${available.length}`
    );

    if (
        available.length === 0
    ) {
        throw new Error(
            `Shopping 추천 가능한 신규 상품이 없습니다. 검색주제: ${searchTopic}`
        );
    }

    const selected =
        available[0];

    const result = {

        searchTopic,

        productId:
            selected.productId,

        name:
            selected.name,

        price:
            selected.price,

        image:
            selected.image,

        url:
            selected.url

    };

    console.log(
        `[SHOPPING RECOMMENDATION] 선택 : ${result.name}`
    );

    console.log(
        `[SHOPPING RECOMMENDATION] PRODUCT ID : ${result.productId}`
    );

    return result;
}


export default {
    selectShoppingRecommendation
};

