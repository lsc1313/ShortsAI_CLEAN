/*
=========================================================
ShortsAI Blog Factory
BLOG TEMPLATE v3.1
=========================================================

역할
- 실제 블로그형 HTML 구성
- 등록 상품 이미지만 사용
- Cloudinary HTTPS 이미지 사용
- 이미지를 본문 사이에 분산
- 각 상품 이미지 아래 쿠팡 CTA 배치
- 마지막 최종 CTA 유지
- 쿠팡 파트너 URL 원본 유지
- 파트너스 고지 자동 삽입
=========================================================
*/


function escapeHtml(value = "") {

    return String(
        value ?? ""
    )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function textToHtml(value = "") {

    return escapeHtml(
        value
    )
        .replace(
            /\r?\n\r?\n/g,
            "</p><p>"
        )
        .replace(
            /\r?\n/g,
            "<br>"
        );

}


/*
=========================================================
상품 이미지
=========================================================
*/

function createImage(
    productName,
    image,
    index
) {

    if (!image) {

        return "";

    }


    const src =
        escapeHtml(
            image
        );


    return `
<figure style="
    margin:32px 0 12px 0;
    text-align:center;
">

    <img
        src="${src}"
        alt="${productName} 상품 이미지 ${index + 1}"
        loading="lazy"
        style="
            display:block;
            max-width:100%;
            height:auto;
            margin:0 auto;
            border-radius:10px;
        "
    >

</figure>
`.trim();

}


/*
=========================================================
이미지 바로 아래 작은 CTA

AI 호출 없음.
product.partnerUrl 원본을 그대로 사용한다.
=========================================================
*/

function createImageCTA(
    productName,
    partnerUrl
) {

    if (!partnerUrl) {

        return "";

    }


    return `
<div style="
    margin:0 0 34px 0;
    text-align:center;
">

    <a
        href="${escapeHtml(partnerUrl)}"
        target="_blank"
        rel="nofollow sponsored"
        style="
            display:inline-block;
            padding:12px 20px;
            font-weight:bold;
            line-height:1.5;
            text-decoration:none;
            border:1px solid #333;
            border-radius:8px;
        "
    >
        ${productName} 상품 정보 확인하기
    </a>

</div>
`.trim();

}


/*
=========================================================
일반 본문 섹션
=========================================================
*/

function createSection(
    section
) {

    if (
        !section?.heading ||
        !section?.body
    ) {

        return "";

    }


    return `
<section style="margin:34px 0;">

    <h2 style="
        margin:0 0 14px 0;
        line-height:1.45;
    ">
        ${escapeHtml(section.heading)}
    </h2>

    <p style="
        margin:0;
        line-height:1.85;
    ">
        ${textToHtml(section.body)}
    </p>

</section>
`.trim();

}


/*
=========================================================
구매 체크포인트
=========================================================
*/

function createCheckPoints(
    points
) {

    if (
        !Array.isArray(points) ||
        !points.length
    ) {

        return "";

    }


    const items =
        points
            .filter(Boolean)
            .map(
                point => `
<li style="
    margin:10px 0;
    line-height:1.7;
">
    ${textToHtml(point)}
</li>
`.trim()
            )
            .join("\n");


    if (!items) {

        return "";

    }


    return `
<section style="
    margin:36px 0;
    padding:22px;
    border:1px solid #e5e5e5;
    border-radius:10px;
">

    <h2 style="
        margin:0 0 14px 0;
        line-height:1.45;
    ">
        구매 전에 체크해보세요
    </h2>

    <ul style="
        margin:0;
        padding-left:22px;
    ">
        ${items}
    </ul>

</section>
`.trim();

}


/*
=========================================================
추천 영역
=========================================================
*/

function createRecommendation(
    value
) {

    if (!value) {

        return "";

    }


    return `
<section style="margin:36px 0;">

    <h2 style="
        margin:0 0 14px 0;
        line-height:1.45;
    ">
        이런 분이라면 살펴볼 만해요
    </h2>

    <p style="
        margin:0;
        line-height:1.85;
    ">
        ${textToHtml(value)}
    </p>

</section>
`.trim();

}


/*
=========================================================
FAQ
=========================================================
*/

function createFAQ(
    faq
) {

    if (
        !Array.isArray(faq) ||
        !faq.length
    ) {

        return "";

    }


    const items =
        faq
            .filter(
                item =>
                    item?.question &&
                    item?.answer
            )
            .map(
                item => `
<div style="margin:24px 0;">

    <h3 style="
        margin:0 0 8px 0;
        line-height:1.55;
    ">
        ${escapeHtml(item.question)}
    </h3>

    <p style="
        margin:0;
        line-height:1.8;
    ">
        ${textToHtml(item.answer)}
    </p>

</div>
`.trim()
            )
            .join("\n");


    if (!items) {

        return "";

    }


    return `
<section style="margin:40px 0;">

    <h2 style="
        margin:0 0 18px 0;
        line-height:1.45;
    ">
        많이 궁금해하는 부분
    </h2>

    ${items}

</section>
`.trim();

}


/*
=========================================================
마지막 메인 CTA
=========================================================
*/

function createCTA(
    productName,
    partnerUrl
) {

    return `
<div style="
    margin:40px 0;
    padding:24px 18px;
    text-align:center;
    border:1px solid #e5e5e5;
    border-radius:12px;
">

    <p style="
        margin:0 0 16px 0;
        line-height:1.7;
    ">
        현재 판매 중인 옵션과 구성은
        상품 페이지에서 확인할 수 있습니다.
    </p>

    <a
        href="${escapeHtml(partnerUrl)}"
        target="_blank"
        rel="nofollow sponsored"
        style="
            display:inline-block;
            padding:14px 24px;
            font-weight:bold;
            text-decoration:none;
            border:1px solid #333;
            border-radius:8px;
        "
    >
        ${productName} 현재 상품 정보 확인하기
    </a>

</div>
`.trim();

}


/*
=========================================================
MAIN HTML
=========================================================
*/

export function createBlogHTML({
    product,
    content
}) {

    if (!product) {

        throw new Error(
            "BlogTemplate: 상품 정보가 없습니다."
        );

    }


    const rawProductName =
        String(
            product.name ||
            "추천 상품"
        ).trim();


    const productName =
        escapeHtml(
            rawProductName
        );


    const partnerUrl =
        String(
            product.partnerUrl ||
            ""
        ).trim();


    if (!partnerUrl) {

        throw new Error(
            "BlogTemplate: 쿠팡 파트너스 링크가 없습니다."
        );

    }


    /*
    =====================================================
    최대 이미지 3장
    =====================================================
    */

    const images =
        Array.isArray(
            product.images
        )
            ? product.images
                .filter(Boolean)
                .slice(0, 3)

            : [];


    /*
    =====================================================
    본문 섹션 최대 3개
    =====================================================
    */

    const sections =
        Array.isArray(
            content?.sections
        )
            ? content.sections
                .filter(
                    item =>
                        item?.heading &&
                        item?.body
                )
                .slice(0, 3)

            : [];


    const intro =
        textToHtml(
            content?.intro
        );


    const closing =
        textToHtml(
            content?.closing
        );


    /*
    =====================================================
    IMAGE
    =====================================================
    */

    const image1 =
        createImage(
            productName,
            images[0],
            0
        );


    const image2 =
        createImage(
            productName,
            images[1],
            1
        );


    const image3 =
        createImage(
            productName,
            images[2],
            2
        );


    /*
    =====================================================
    IMAGE CTA

    이미지가 실제 존재하는 경우에만 CTA 생성
    =====================================================
    */

    const imageCTA1 =
        images[0]
            ? createImageCTA(
                productName,
                partnerUrl
            )
            : "";


    const imageCTA2 =
        images[1]
            ? createImageCTA(
                productName,
                partnerUrl
            )
            : "";


    const imageCTA3 =
        images[2]
            ? createImageCTA(
                productName,
                partnerUrl
            )
            : "";


    /*
    =====================================================
    CONTENT
    =====================================================
    */

    const section1 =
        createSection(
            sections[0]
        );


    const section2 =
        createSection(
            sections[1]
        );


    const section3 =
        createSection(
            sections[2]
        );


    const checkPoints =
        createCheckPoints(
            content?.checkPoints
        );


    const recommendation =
        createRecommendation(
            content?.recommendation
        );


    const faq =
        createFAQ(
            content?.faq
        );


    const cta =
        createCTA(
            productName,
            partnerUrl
        );


    /*
    =====================================================
    FINAL HTML
    =====================================================
    */

    return `
<article style="
    max-width:760px;
    margin:0 auto;
    line-height:1.8;
">

    <p style="
        margin:0 0 28px 0;
        padding:14px 16px;
        border:1px solid #e5e5e5;
        border-radius:8px;
        line-height:1.65;
    ">
        <strong>
            ※ 이 포스팅은 쿠팡 파트너스 활동의 일환으로,
            이에 따른 일정액의 수수료를 제공받습니다.
        </strong>
    </p>


    <h1 style="
        margin:0 0 24px 0;
        line-height:1.45;
    ">
        ${escapeHtml(
            content?.title ||
            rawProductName
        )}
    </h1>


    <p style="
        margin:0 0 28px 0;
        line-height:1.85;
    ">
        ${intro}
    </p>


    ${image1}

    ${imageCTA1}


    ${section1}


    ${image2}

    ${imageCTA2}


    ${section2}


    ${checkPoints}


    ${image3}

    ${imageCTA3}


    ${section3}


    ${recommendation}


    ${faq}


    ${
        closing
            ? `
<section style="margin:38px 0;">

    <p style="
        margin:0;
        line-height:1.85;
    ">
        ${closing}
    </p>

</section>
`
            : ""
    }


    ${cta}


    <hr style="
        margin:40px 0 26px 0;
        border:0;
        border-top:1px solid #e5e5e5;
    ">


    <p style="
        margin:0 0 18px 0;
        line-height:1.7;
        font-size:0.95em;
    ">
        ※ 상품의 가격, 옵션, 구성, 재고, 할인 및 배송 정보는
        판매 페이지와 판매 시점에 따라 달라질 수 있습니다.
        구매 전 판매 페이지의 최신 정보를 확인해주세요.
    </p>


    <p style="
        margin:0;
        line-height:1.65;
        font-size:0.95em;
    ">
        <strong>
            ※ 이 포스팅은 쿠팡 파트너스 활동의 일환으로,
            이에 따른 일정액의 수수료를 제공받습니다.
        </strong>
    </p>

</article>
`.trim();

}


export default {

    createBlogHTML

};
