/*
=========================================================
ShortsAI Blog Factory
BLOG VALIDATOR v1
=========================================================

역할

Blogger 전송 직전 최종 검수

중요

- AI 호출 없음
- 외부 API 호출 없음
- 원본 Product DB 수정 없음
- HTML 수정 없음
- 검사만 수행
=========================================================
*/

function text(value = "") {

    return String(
        value ?? ""
    ).trim();

}


function isHttpUrl(value = "") {

    return /^https?:\/\//i.test(
        text(value)
    );

}


function isHttpsUrl(value = "") {

    return /^https:\/\//i.test(
        text(value)
    );

}


export function validateBlog({
    product,
    content,
    html,
    blogProduct
} = {}) {

    const errors = [];
    const warnings = [];


    /*
    =====================================================
    PRODUCT
    =====================================================
    */

    if (!product) {

        errors.push(
            "상품 정보가 없습니다."
        );

    }


    if (!text(product?.name)) {

        errors.push(
            "상품명이 없습니다."
        );

    }


    if (!text(product?.partnerUrl)) {

        errors.push(
            "쿠팡 파트너스 링크가 없습니다."
        );

    }
    else if (
        !isHttpUrl(
            product.partnerUrl
        )
    ) {

        errors.push(
            "쿠팡 파트너스 링크 형식이 올바르지 않습니다."
        );

    }


    /*
    =====================================================
    AI CONTENT
    =====================================================
    */

    if (!content) {

        errors.push(
            "블로그 AI 결과가 없습니다."
        );

    }


    if (!text(content?.title)) {

        errors.push(
            "블로그 제목이 없습니다."
        );

    }


    if (!text(content?.intro)) {

        warnings.push(
            "블로그 도입부가 없습니다."
        );

    }


    if (!text(content?.overview)) {

        warnings.push(
            "상품 설명이 없습니다."
        );

    }


    /*
    =====================================================
    HTML
    =====================================================
    */

    const htmlText =
        text(html);


    if (!htmlText) {

        errors.push(
            "블로그 HTML이 없습니다."
        );

    }


    /*
    파트너 URL이 실제 HTML에도
    들어갔는지 확인한다.
    */

    const partnerUrl =
        text(
            product?.partnerUrl
        );


    if (
        partnerUrl &&
        !htmlText.includes(
            partnerUrl
        )
    ) {

        errors.push(
            "HTML에 쿠팡 파트너스 링크가 없습니다."
        );

    }


    /*
    쿠팡 파트너스 고지문 검사

    문구 전체를 강제하지 않고
    핵심 표현 존재 여부를 검사한다.
    */

    if (
        !htmlText.includes(
            "쿠팡 파트너스 활동의 일환"
        )
    ) {

        errors.push(
            "쿠팡 파트너스 고지문이 없습니다."
        );

    }


    if (
        !htmlText.includes(
            "수수료"
        )
    ) {

        warnings.push(
            "수수료 관련 고지 표현을 확인하세요."
        );

    }


    /*
    =====================================================
    IMAGE
    =====================================================
    */

    const images =
        Array.isArray(
            blogProduct?.images
        )
            ? blogProduct.images
                .filter(Boolean)
            : [];


    if (images.length === 0) {

        errors.push(
            "블로그 상품 이미지가 없습니다."
        );

    }


    images.forEach(
        (image, index) => {

            const url =
                text(image);


            if (
                !isHttpsUrl(url)
            ) {

                errors.push(
                    `상품 이미지 ${index + 1}이 HTTPS URL이 아닙니다.`
                );

                return;

            }


            /*
            Blogger가 접근할 수 없는
            Termux 로컬 이미지가 남아있는지 검사
            */

            if (
                url.includes(
                    "/media/products/"
                ) ||
                url.startsWith(
                    "file:"
                )
            ) {

                errors.push(
                    `상품 이미지 ${index + 1}에 로컬 경로가 남아 있습니다.`
                );

            }

        }
    );


    /*
    HTML 안의 IMG 개수 확인
    */

    const htmlImageCount =
        (
            htmlText.match(
                /<img\b/gi
            ) || []
        ).length;


    if (
        images.length > 0 &&
        htmlImageCount === 0
    ) {

        errors.push(
            "HTML에 상품 이미지 태그가 없습니다."
        );

    }


    if (
        images.length > 0 &&
        htmlImageCount < images.length
    ) {

        warnings.push(
            `상품 이미지 ${images.length}장 중 HTML에는 ${htmlImageCount}장만 확인됩니다.`
        );

    }


    /*
    =====================================================
    LOCAL PATH LEAK
    =====================================================
    */

    if (
        htmlText.includes(
            "/media/products/"
        )
    ) {

        errors.push(
            "HTML에 로컬 상품 이미지 경로가 남아 있습니다."
        );

    }


    /*
    =====================================================
    RESULT
    =====================================================
    */

    const valid =
        errors.length === 0;


    return {

        valid,

        errors,

        warnings,

        stats: {

            imageCount:
                images.length,

            htmlImageCount,

            titleLength:
                text(
                    content?.title
                ).length,

            htmlLength:
                htmlText.length

        }

    };

}


export function assertValidBlog(
    input = {}
) {

    const result =
        validateBlog(
            input
        );


    if (!result.valid) {

        const error =
            new Error(
                `BlogValidator 실패: ${result.errors.join(" / ")}`
            );


        error.name =
            "BlogValidationError";

        error.validation =
            result;


        throw error;

    }


    return result;

}


export default {

    validateBlog,
    assertValidBlog

};
