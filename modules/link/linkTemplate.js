/*
=========================================================
ShortsAI Link Factory
LINK TEMPLATE v2 - COMPACT SHOP
=========================================================

역할
- 모바일 우선 상품 모아보기 페이지
- 2열 Compact Grid
- 이미지 + 상품명만 노출
- 가격 / 할인율 미노출
- 카드 전체 클릭 -> 쿠팡 파트너스
- 최근 제작 상품 우선
- AI 호출 없음

=========================================================
*/

function escapeHtml(value = "") {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function createProductCard(item, index) {

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
        Array.isArray(item.images)
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
    <a
        class="product-card"
        href="${url}"
        rel="nofollow sponsored"
        aria-label="${name} 상품 확인하기"
    >

        ${
            index === 0
                ? `
                <span class="latest-badge">
                    최근 영상
                </span>
                `
                : ""
        }

        <div class="product-image">
            ${imageHtml}
        </div>

        <div class="product-name">
            ${name}
        </div>

    </a>
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
            .map(createProductCard)
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
    content="영상에서 소개한 상품을 빠르게 확인하세요."
>

<style>

* {
    box-sizing:border-box;
}

html {
    -webkit-text-size-adjust:100%;
}

body {
    margin:0;
    background:#f7f7f7;
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
    padding:26px 16px 44px;
}


/* =====================================================
HEADER
===================================================== */

.header {
    text-align:center;
    margin-bottom:24px;
}

.header h1 {
    margin:0 0 8px;
    font-size:26px;
    line-height:1.35;
    font-weight:800;
    letter-spacing:-0.7px;
}

.header p {
    margin:0;
    color:#777;
    font-size:14px;
    line-height:1.5;
}


/* =====================================================
COUPANG NOTICE
===================================================== */

.notice {
    margin:0 0 24px;
    padding:12px 13px;

    background:#fff;

    border:
        1px solid #e4e4e4;

    border-radius:12px;

    color:#666;

    font-size:11px;
    line-height:1.55;
}


/* =====================================================
PRODUCT GRID
===================================================== */

.product-grid {
    display:grid;

    grid-template-columns:
        repeat(3, minmax(0,1fr));

    gap:14px;
}


/* =====================================================
PRODUCT CARD
===================================================== */

.product-card {
    position:relative;

    display:block;

    overflow:hidden;

    min-width:0;

    background:#fff;

    border:
        1px solid #e7e7e7;

    border-radius:15px;

    color:#181818;

    text-decoration:none;

    box-shadow:
        0 2px 8px rgba(0,0,0,0.035);

    -webkit-tap-highlight-color:
        transparent;
}

.product-card:active {
    transform:scale(0.985);
}


/* =====================================================
LATEST
===================================================== */

.latest-badge {
    position:absolute;

    z-index:2;

    top:8px;
    left:8px;

    padding:5px 7px;

    background:#292929;

    border-radius:6px;

    color:#fff;

    font-size:10px;
    line-height:1;

    font-weight:700;
}


/* =====================================================
IMAGE
===================================================== */

.product-image {
    display:flex;

    align-items:center;
    justify-content:center;

    width:100%;

    aspect-ratio:1 / 1;

    overflow:hidden;

    background:#fff;
}

.product-image img {
    display:block;

    width:100%;
    height:100%;

    object-fit:contain;

    padding:6px;
}

.no-image {
    display:flex;

    align-items:center;
    justify-content:center;

    width:100%;
    height:100%;

    background:#eee;

    color:#999;

    font-size:12px;
}


/* =====================================================
NAME
===================================================== */

.product-name {
    min-height:56px;

    padding:
        9px 8px 10px;

    border-top:
        1px solid #f1f1f1;

    font-size:13px;
    line-height:1.4;

    font-weight:700;

    word-break:keep-all;

    overflow-wrap:break-word;

    display:-webkit-box;

    -webkit-line-clamp:2;
    -webkit-box-orient:vertical;

    overflow:hidden;
}


/* =====================================================
EMPTY
===================================================== */

.empty {
    padding:50px 20px;

    background:#fff;

    border:
        1px solid #e8e8e8;

    border-radius:15px;

    text-align:center;

    color:#777;

    font-size:14px;
}


/* =====================================================
FOOTER
===================================================== */

.footer {
    margin-top:30px;

    color:#999;

    text-align:center;

    font-size:11px;
    line-height:1.6;
}


/* =====================================================
SMALL PHONE
===================================================== */

@media (max-width:360px) {

    .page {
        padding-left:12px;
        padding-right:12px;
    }

    .product-grid {
        gap:10px;
    }

    .product-name {
        font-size:14px;
    }

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
            영상에서 소개한 상품을 빠르게 확인하세요.
        </p>

    </header>


    <div class="notice">
        ※ 이 페이지는 쿠팡 파트너스 활동의 일환으로,
        이에 따른 일정액의 수수료를 제공받습니다.
    </div>


    ${
        cards
            ? `
            <section
                class="product-grid"
                aria-label="영상 속 상품"
            >
                ${cards}
            </section>
            `
            : `
            <div class="empty">
                아직 등록된 상품이 없습니다.
            </div>
            `
    }


    <footer class="footer">
        상품의 가격, 옵션, 구성, 재고, 할인 및 배송 정보는
        판매 페이지에서 확인할 수 있습니다.
    </footer>

</main>

</body>

</html>
`.trim();

}


export default {
    createLinkHTML
};
