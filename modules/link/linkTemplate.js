/*
=========================================================
ShortsAI Link Factory
LINK TEMPLATE v1
=========================================================

역할
- 모바일 우선 상품 링크 페이지 생성
- 최근 제작 상품 우선
- 쿠팡 파트너스 링크 직접 연결
- AI 호출 없음
=========================================================
*/


function escapeHtml(
    value = ""
) {

    return String(
        value ?? ""
    )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function createProductCard(
    item,
    index
) {

    const name =
        escapeHtml(
            item.productName ||
            "상품"
        );

    const url =
        escapeHtml(
            item.partnerUrl ||
            ""
        );

    const image =
        Array.isArray(
            item.images
        )
            ? item.images.find(Boolean)
            : null;


    const imageHtml =
        image
            ? `
<img
    src="${escapeHtml(image)}"
    alt="${name}"
    loading="lazy"
>
`
            : `
<div class="no-image">
    상품 이미지
</div>
`;


    return `
<article class="product-card">

    ${
        index === 0
            ? `
        <div class="latest-badge">
            최근 영상 상품
        </div>
        `
            : ""
    }

    <a
        class="image-link"
        href="${url}"
        rel="nofollow sponsored"
    >
        ${imageHtml}
    </a>

    <div class="product-body">

        <h2>
            ${name}
        </h2>

        <a
            class="product-button"
            href="${url}"
            rel="nofollow sponsored"
        >
            상품 정보 확인하기
        </a>

    </div>

</article>
`.trim();

}


export function createLinkHTML({
    records = []
} = {}) {

    const activeRecords =
        Array.isArray(records)
            ? records
                .filter(
                    item =>
                        item &&
                        item.enabled !== false &&
                        item.partnerUrl
                )
                .slice(0, 50)
            : [];


    const cards =
        activeRecords
            .map(
                createProductCard
            )
            .join("\n\n");


    return `
<!doctype html>

<html lang="ko">

<head>

<meta charset="utf-8">

<meta
    name="viewport"
    content="width=device-width,initial-scale=1,maximum-scale=1"
>

<title>영상 속 상품 모아보기</title>

<meta
    name="description"
    content="영상에서 소개한 상품을 한곳에서 확인하세요."
>

<style>

* {
    box-sizing:border-box;
}

body {
    margin:0;
    background:#f6f6f6;
    color:#181818;
    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Arial,
        sans-serif;
}

.page {
    width:100%;
    max-width:640px;
    margin:0 auto;
    padding:24px 16px 50px;
}

.header {
    text-align:center;
    margin-bottom:26px;
}

.header h1 {
    margin:0 0 10px;
    font-size:26px;
    line-height:1.35;
}

.header p {
    margin:0;
    color:#666;
    font-size:15px;
    line-height:1.6;
}

.notice {
    margin:0 0 22px;
    padding:13px 14px;
    background:#fff;
    border:1px solid #e5e5e5;
    border-radius:12px;
    font-size:12px;
    line-height:1.6;
    color:#666;
}

.product-card {
    position:relative;
    overflow:hidden;
    margin:0 0 22px;
    background:#fff;
    border:1px solid #e8e8e8;
    border-radius:18px;
    box-shadow:
        0 3px 12px
        rgba(0,0,0,0.05);
}

.latest-badge {
    position:absolute;
    z-index:2;
    top:12px;
    left:12px;
    padding:7px 10px;
    border-radius:999px;
    background:#111;
    color:#fff;
    font-size:12px;
    font-weight:700;
}

.image-link {
    display:block;
    text-decoration:none;
}

.product-card img {
    display:block;
    width:100%;
    max-height:430px;
    object-fit:contain;
    background:#fff;
}

.no-image {
    display:flex;
    align-items:center;
    justify-content:center;
    width:100%;
    height:240px;
    background:#eee;
    color:#888;
}

.product-body {
    padding:18px;
}

.product-body h2 {
    margin:0 0 16px;
    font-size:18px;
    line-height:1.55;
}

.product-button {
    display:block;
    width:100%;
    padding:15px 16px;
    border-radius:12px;
    background:#111;
    color:#fff;
    text-align:center;
    text-decoration:none;
    font-size:16px;
    font-weight:700;
}

.empty {
    padding:50px 20px;
    background:#fff;
    border-radius:16px;
    text-align:center;
    color:#777;
}

.footer {
    margin-top:30px;
    color:#888;
    text-align:center;
    font-size:12px;
    line-height:1.7;
}

</style>

</head>

<body>

<main class="page">

    <header class="header">

        <h1>
            영상 속 상품 모아보기
        </h1>

        <p>
            최근 영상에서 소개한 상품부터 확인할 수 있습니다.
        </p>

    </header>


    <div class="notice">
        ※ 이 페이지는 쿠팡 파트너스 활동의 일환으로,
        이에 따른 일정액의 수수료를 제공받습니다.
    </div>


    ${
        cards ||
        `
        <div class="empty">
            아직 등록된 상품이 없습니다.
        </div>
        `
    }


    <footer class="footer">

        상품의 가격, 옵션, 구성, 재고, 할인 및 배송 정보는
        판매 페이지와 시점에 따라 달라질 수 있습니다.

    </footer>

</main>

</body>

</html>
`.trim();

}


export default {

    createLinkHTML

};
