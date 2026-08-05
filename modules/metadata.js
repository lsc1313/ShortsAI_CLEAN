export function createMetadata(
    aiData,
    options = {}
){

    const product =
        options?.product || null;


    /*
        =====================================================
        일반 쇼츠
        =====================================================
    */

    if (
        !product ||
        !product.partnerUrl
    ) {

        const title =
            aiData.title ||
            aiData.hook ||
            "놀라운 사실 이야기";


        const description =
`알면 재미있는 정보 쇼츠입니다.

${aiData.description || ""}

더 많은 흥미로운 이야기를 원한다면
구독과 댓글 부탁드립니다.`;


        const tags = [

            "shorts",
            "유튜브쇼츠",
            "정보",
            "상식",
            "놀라운사실",
            "재미있는이야기",
            "지식"

        ];


        return {

            title,

            description,

            tags,

            categoryId:
                "22"

        };

    }


    /*
        =====================================================
        SHOPPING SHORTS
        =====================================================

        중요

        - 일반 정보쇼츠 설명을 사용하지 않는다.
        - Resolver가 확정한 상품정보를 사용한다.
        - 저장된 partnerUrl을 그대로 사용한다.
        - AI가 URL을 생성하거나 수정하지 않는다.
        =====================================================
    */


    const productName =
        product.productTitle ||
        product.name ||
        "추천 상품";


    const title =
        aiData.title ||
        productName;


    const lines = [];


    /*
        상품명
    */

    lines.push(
        `🛒 ${productName}`
    );


    /*
        AI가 생성한 상품 소개
    */

    if (
        aiData.description &&
        String(aiData.description).trim()
    ) {

        lines.push("");

        lines.push(
            String(
                aiData.description
            ).trim()
        );

    }


    /*
        상품 정보
    */

    const info = [];


    if (
        product.price !== undefined &&
        product.price !== null &&
        String(product.price).trim() !== ""
    ) {

        info.push(
            `💰 판매가: ${formatPrice(product.price)}`
        );

    }


    if (
        product.originalPrice !== undefined &&
        product.originalPrice !== null &&
        String(product.originalPrice).trim() !== ""
    ) {

        info.push(
            `🏷️ 정상가: ${formatPrice(product.originalPrice)}`
        );

    }


    if (
        product.discountRate !== undefined &&
        product.discountRate !== null &&
        String(product.discountRate).trim() !== ""
    ) {

        info.push(
            `🔥 할인: ${formatPercent(product.discountRate)}`
        );

    }


    if (
        product.unitPrice !== undefined &&
        product.unitPrice !== null &&
        String(product.unitPrice).trim() !== ""
    ) {

        info.push(
            `📦 단위가격: ${product.unitPrice}`
        );

    }


    if (
        product.rating !== undefined &&
        product.rating !== null &&
        String(product.rating).trim() !== ""
    ) {

        info.push(
            `⭐ 평점: ${product.rating}`
        );

    }


    const reviewCount =
        product.actualReviewCount ??
        product.reviewCount;


    if (
        reviewCount !== undefined &&
        reviewCount !== null &&
        String(reviewCount).trim() !== ""
    ) {

        info.push(
            `💬 리뷰: ${formatNumber(reviewCount)}개`
        );

    }


    const delivery =
        product.delivery ||
        product.rocketDelivery;


    if (
        delivery !== undefined &&
        delivery !== null &&
        String(delivery).trim() !== ""
    ) {

        info.push(
            `🚚 배송: ${formatDelivery(delivery)}`
        );

    }


    if (
        product.attributes
    ) {

        const attributes =
            formatAttributes(
                product.attributes
            );


        if (attributes) {

            info.push(
                `📋 구성/규격: ${attributes}`
            );

        }

    }


    if (info.length > 0) {

        lines.push("");

        lines.push(
            "📌 상품 정보"
        );

        lines.push(
            ...info
        );

    }


    /*
        구매 링크

        partnerUrl은 저장된 값을
        어떠한 가공도 하지 않고 그대로 출력한다.
    */

    lines.push("");

    lines.push(
        "👇 상품 자세히 보기 / 구매하기"
    );

    lines.push(
        String(product.partnerUrl).trim()
    );


    /*
        가격 변동 안내
    */

    lines.push("");

    lines.push(
        "※ 가격·할인·배송 정보는 판매처 상황에 따라 변경될 수 있습니다."
    );


    /*
        쿠팡 파트너스 고지
    */

    lines.push("");

    lines.push(
        "※ 이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."
    );


    /*
        설명란 해시태그
    */

    lines.push("");

    lines.push(
        "#쇼츠 #제품추천 #쇼핑추천 #쿠팡파트너스"
    );


    const description =
        lines.join("\n");


    /*
        YouTube tags
    */

    const tags = [

        "shorts",
        "쇼츠",
        "제품추천",
        "쇼핑",
        "쇼핑추천",
        "생활용품",
        "쿠팡파트너스"

    ];


    /*
        상품명도 검색 태그 후보로 추가
    */

    const cleanProductTag =
        String(productName)
            .replace(/[^\p{L}\p{N}\s]/gu, " ")
            .replace(/\s+/g, " ")
            .trim();


    if (cleanProductTag) {

        tags.push(
            cleanProductTag
        );

    }


    return {

        title,

        description,

        tags,

        categoryId:
            "22"

    };

}


/*
    =========================================================
    HELPERS
    =========================================================
*/


function formatPrice(value) {

    if (
        typeof value === "number"
    ) {

        return (
            value.toLocaleString("ko-KR") +
            "원"
        );

    }


    const text =
        String(value).trim();


    if (!text) {

        return "";

    }


    if (
        text.includes("원")
    ) {

        return text;

    }


    const numeric =
        text.replace(
            /[^0-9]/g,
            ""
        );


    if (numeric) {

        return (
            Number(numeric)
                .toLocaleString("ko-KR") +
            "원"
        );

    }


    return text;

}


function formatPercent(value) {

    const text =
        String(value).trim();


    if (!text) {

        return "";

    }


    if (
        text.includes("%")
    ) {

        return text;

    }


    return `${text}%`;

}


function formatNumber(value) {

    if (
        typeof value === "number"
    ) {

        return value.toLocaleString(
            "ko-KR"
        );

    }


    const text =
        String(value).trim();


    const numeric =
        text.replace(
            /[^0-9]/g,
            ""
        );


    if (numeric) {

        return Number(numeric)
            .toLocaleString(
                "ko-KR"
            );

    }


    return text;

}


function formatDelivery(value) {

    if (
        typeof value === "boolean"
    ) {

        return value
            ? "로켓배송"
            : "";

    }


    if (
        typeof value === "object" &&
        value !== null
    ) {

        return (
            value.name ||
            value.type ||
            value.text ||
            value.label ||
            ""
        );

    }


    return String(value).trim();

}


function formatAttributes(value) {

    if (
        Array.isArray(value)
    ) {

        return value
            .map(item => {

                if (
                    typeof item === "string"
                ) {

                    return item.trim();

                }


                if (
                    item &&
                    typeof item === "object"
                ) {

                    const key =
                        item.name ||
                        item.key ||
                        item.label ||
                        "";

                    const val =
                        item.value ||
                        item.text ||
                        "";


                    if (
                        key &&
                        val
                    ) {

                        return `${key}: ${val}`;

                    }


                    return (
                        val ||
                        key
                    );

                }


                return "";

            })
            .filter(Boolean)
            .join(" / ");

    }


    if (
        typeof value === "object" &&
        value !== null
    ) {

        return Object.entries(value)
            .map(
                ([key, val]) =>
                    `${key}: ${val}`
            )
            .join(" / ");

    }


    return String(value).trim();

}
