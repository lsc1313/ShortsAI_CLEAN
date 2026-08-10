/*
=========================================================
ShortsAI Science Blog Factory
SCIENCE BLOG TEMPLATE v1
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

function textToHtml(value = "") {

    return escapeHtml(value)
        .replace(
            /\r?\n\r?\n/g,
            "</p><p>"
        )
        .replace(
            /\r?\n/g,
            "<br>"
        );

}

function createBlogImage(
    image,
    alt = ""
) {

    if (!image) {

        return "";

    }

    return `
<figure style="
    margin:32px 0;
    text-align:center;
">
    <img
        src="${escapeHtml(image)}"
        alt="${escapeHtml(alt)}"
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

function createIntro(
    intro
) {

    if (!intro) {

        return "";

    }

    return `
<section style="
    margin:24px 0 34px 0;
">
    <p style="
        margin:0;
        line-height:1.9;
    ">
        ${textToHtml(intro)}
    </p>
</section>
`.trim();

}

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
<section style="
    margin:36px 0;
">

    <h2 style="
        margin:0 0 14px 0;
        line-height:1.45;
    ">
        ${escapeHtml(section.heading)}
    </h2>

    <p style="
        margin:0;
        line-height:1.9;
    ">
        ${textToHtml(section.body)}
    </p>

</section>
`.trim();

}

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
    margin:40px 0;
    padding:22px;
    border:1px solid #e5e5e5;
    border-radius:10px;
">

    <h2 style="
        margin:0 0 14px 0;
        line-height:1.45;
    ">
        핵심 내용 정리
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
<div style="
    margin:24px 0;
">

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
<section style="
    margin:40px 0;
">

    <h2 style="
        margin:0 0 18px 0;
        line-height:1.45;
    ">
        자주 궁금해하는 부분
    </h2>

    ${items}

</section>
`.trim();

}

function createClosing(
    closing
) {

    if (!closing) {

        return "";

    }

    return `
<section style="
    margin:40px 0 20px 0;
">

    <p style="
        margin:0;
        line-height:1.9;
    ">
        ${textToHtml(closing)}
    </p>

</section>
`.trim();

}

function createTags(
    tags
) {

    if (
        !Array.isArray(tags) ||
        !tags.length
    ) {

        return "";

    }

    const items =
        tags
            .filter(Boolean)
            .map(
                tag => `
<span style="
    display:inline-block;
    margin:4px 4px 4px 0;
    padding:6px 10px;
    border-radius:6px;
    background:#f5f5f5;
    font-size:13px;
">
    #${escapeHtml(tag)}
</span>
`.trim()
            )
            .join("\n");

    return `
<div style="
    margin-top:40px;
">
    ${items}
</div>
`.trim();

}


/*
=========================================================
MAIN
=========================================================
*/

export function createScienceBlogHTML({
    content,
    images = []
} = {}) {

    if (!content) {

        throw new Error(
            "ScienceBlogTemplate: content가 없습니다."
        );

    }

    const imageList =
        Array.isArray(images)
            ? images.filter(Boolean)
            : [];

    const sections =
        Array.isArray(content.sections)
            ? content.sections
            : [];

    const parts = [];

    parts.push(
        createIntro(
            content.intro
        )
    );

    for (
        let index = 0;
        index < sections.length;
        index++
    ) {

        const sectionHtml =
            createSection(
                sections[index]
            );

        if (sectionHtml) {

            parts.push(
                sectionHtml
            );

        }

        /*
        대표 이미지를 본문 중간에 분산한다.
        첫 번째 이미지는 SECTION 1 이후,
        두 번째 이미지는 SECTION 3 이후에 배치한다.
        */

        if (
            index === 0 &&
            imageList[0]
        ) {

            parts.push(
                createBlogImage(
                    imageList[0],
                    content.title
                )
            );

        }

        if (
            index === 2 &&
            imageList[1]
        ) {

           parts.push(
                createBlogImage(
                    imageList[1],
                    content.title
                )
            );

        }

    }

    parts.push(
        createCheckPoints(
            content.checkPoints
        )
    );

    parts.push(
        createFAQ(
            content.faq
        )
    );

    parts.push(
        createClosing(
            content.closing
        )
    );

    parts.push(
        createTags(
            content.tags
        )
    );

    const body =
        parts
            .filter(Boolean)
            .join("\n\n");

    return `
<article style="
    max-width:760px;
    margin:0 auto;
    font-family:Arial,
        "Noto Sans KR",
        sans-serif;
    color:#222;
">

    <header style="
        margin-bottom:30px;
    ">

        <h1 style="
            margin:0;
            line-height:1.4;
            font-size:30px;
        ">
            ${escapeHtml(content.title || "")}
        </h1>

    </header>

    ${body}

</article>
`.trim();

}

export default {
    createScienceBlogHTML
};
