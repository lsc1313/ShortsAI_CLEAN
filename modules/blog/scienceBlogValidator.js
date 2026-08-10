/*
=========================================================
ShortsAI Science Blog Factory
SCIENCE BLOG VALIDATOR v1
=========================================================

역할

Science Blog이 Blogger로 전송되기 전에
최종 콘텐츠 품질을 검사한다.

중요

- AI 호출 없음
- 외부 API 호출 없음
- Product DB 수정 없음
- HTML 수정 없음
- 검사만 수행
- 실패하면 Blogger API 호출 금지

검사 대상

1. title
2. intro
3. sections
4. checkPoints
5. faq
6. closing
7. imageQueries
8. tags
9. HTML
10. HTML 이미지
=========================================================
*/


function text(
    value = ""
) {

    return String(
        value ?? ""
    ).trim();

}


function isHttpsUrl(
    value = ""
) {

    return /^https:\/\//i.test(
        text(value)
    );

}


function validateScienceBlog({
    content,
    html,
    images = []
} = {}) {

    const errors = [];

    const warnings = [];


    /*
    =====================================================
    CONTENT
    =====================================================
    */

    if (!content) {

        errors.push(
            "Science Blog 콘텐츠가 없습니다."
        );

        return {
            valid: false,
            errors,
            warnings,
            stats: {
                sectionCount: 0,
                checkPointCount: 0,
                faqCount: 0,
                imageCount: 0,
                htmlImageCount: 0,
                tagCount: 0,
                htmlLength: 0
            }
        };

    }


    /*
    =====================================================
    TITLE
    =====================================================
    */

    if (!text(content.title)) {

        errors.push(
            "Science Blog 제목이 없습니다."
        );

    }


    /*
    =====================================================
    INTRO
    =====================================================
    */

    if (!text(content.intro)) {

        errors.push(
            "Science Blog 도입부가 없습니다."
        );

    }


    /*
    =====================================================
    SECTIONS
    =====================================================
    */

    const sections =
        Array.isArray(
            content.sections
        )
            ? content.sections
            : [];


    if (
        sections.length !== 4
    ) {

        errors.push(
            `Science Blog 섹션 수가 올바르지 않습니다. (${sections.length}/4)`
        );

    }


    for (
        let index = 0;
        index < sections.length;
        index++
    ) {

        const section =
            sections[index];


        if (
            !text(section?.heading)
        ) {

            errors.push(
                `SECTION ${index + 1} 제목이 없습니다.`
            );

        }


        if (
            !text(section?.body)
        ) {

            errors.push(
                `SECTION ${index + 1} 본문이 없습니다.`
            );

        }

    }


    /*
    =====================================================
    CHECK POINTS
    =====================================================
    */

    const checkPoints =
        Array.isArray(
            content.checkPoints
        )
            ? content.checkPoints
                .filter(
                    value =>
                        Boolean(
                            text(value)
                        )
                )
            : [];


    if (
        checkPoints.length < 3
    ) {

        errors.push(
            `Science Blog 핵심 내용이 부족합니다. (${checkPoints.length}/3)`
        );

    }


    if (
        checkPoints.length > 5
    ) {

        warnings.push(
            `핵심 내용이 권장 최대치보다 많습니다. (${checkPoints.length}/5)`
        );

    }


    /*
    =====================================================
    FAQ
    =====================================================
    */

    const faq =
        Array.isArray(
            content.faq
        )
            ? content.faq
                .filter(
                    item =>
                        text(item?.question) &&
                        text(item?.answer)
                )
            : [];


    if (
        faq.length < 3
    ) {

        errors.push(
            `Science Blog FAQ가 부족합니다. (${faq.length}/3)`
        );

    }


    /*
    =====================================================
    CLOSING
    =====================================================
    */

    if (!text(content.closing)) {

        warnings.push(
            "Science Blog 결론이 없습니다."
        );

    }


    /*
    =====================================================
    IMAGE
    =====================================================
    */

    const imageList =
        Array.isArray(images)
            ? images.filter(Boolean)
            : [];


    if (
        imageList.length === 0
    ) {

        warnings.push(
            "Science Blog 이미지가 없습니다."
        );

    }


    if (
        imageList.length > 2
    ) {

        errors.push(
            `Science Blog 이미지가 너무 많습니다. (${imageList.length}/2)`
        );

    }


    for (
        let index = 0;
        index < imageList.length;
        index++
    ) {

        if (
            !isHttpsUrl(
                imageList[index]
            )
        ) {

            errors.push(
                `Science Blog 이미지 ${index + 1}의 URL이 HTTPS가 아닙니다.`
            );

        }

    }


    /*
    =====================================================
    IMAGE QUERIES
    =====================================================
    */

    const imageQueries =
        Array.isArray(
            content.imageQueries
        )
            ? content.imageQueries
                .filter(
                    value =>
                        Boolean(
                            text(value)
                        )
                )
            : [];


    if (
        imageQueries.length > 2
    ) {

        warnings.push(
            `이미지 검색어가 권장 수량보다 많습니다. (${imageQueries.length}/2)`
        );

    }


    /*
    =====================================================
    TAGS
    =====================================================
    */

    const tags =
        Array.isArray(
            content.tags
        )
            ? content.tags
                .map(
                    value =>
                        text(value)
                            .replace(
                                /^#+/,
                                ""
                            )
                            .trim()
                )
                .filter(Boolean)
            : [];


    if (
        tags.length < 5
    ) {

        warnings.push(
            `Science Blog 태그가 적습니다. (${tags.length}/5)`
        );

    }


    if (
        tags.length > 8
    ) {

        warnings.push(
            `Science Blog 태그가 많습니다. (${tags.length}/8)`
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
            "Science Blog HTML이 없습니다."
        );

    }


    /*
    =====================================================
    HTML IMAGE
    =====================================================
    */

    const htmlImageMatches =
        htmlText.match(
            /<img\b/gi
        );


    const htmlImageCount =
        Array.isArray(
            htmlImageMatches
        )
            ? htmlImageMatches.length
            : 0;


    if (
        imageList.length > 0 &&
        htmlImageCount === 0
    ) {

        errors.push(
            "Science Blog 이미지가 HTML에 포함되지 않았습니다."
        );

    }


    if (
        htmlImageCount > 2
    ) {

        warnings.push(
            `HTML 이미지가 권장 수량보다 많습니다. (${htmlImageCount}/2)`
        );

    }


    /*
    =====================================================
    HTML CONTENT LENGTH
    =====================================================
    */

    const plainText =
        htmlText
            .replace(
                /<script[\s\S]*?<\/script>/gi,
                " "
            )
            .replace(
                /<style[\s\S]*?<\/style>/gi,
                " "
            )
            .replace(
                /<[^>]+>/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();


    const htmlLength =
        plainText.length;


    if (
        htmlLength < 500
    ) {

        errors.push(
            `Science Blog 본문이 지나치게 짧습니다. (${htmlLength}자)`
        );

    }


    /*
    =====================================================
    HTML STRUCTURE
    =====================================================
    */

    if (
        htmlText &&
        !/<article\b/i.test(
            htmlText
        )
    ) {

        warnings.push(
            "HTML에 article 요소가 없습니다."
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

            sectionCount:
                sections.length,

            checkPointCount:
                checkPoints.length,

            faqCount:
                faq.length,

            imageCount:
                imageList.length,

            htmlImageCount,

            tagCount:
                tags.length,

            htmlLength

        }

    };

}


/*
=========================================================
ASSERT
=========================================================
*/

export function assertValidScienceBlog(
    options = {}
) {

    const result =
        validateScienceBlog(
            options
        );


    if (
        !result.valid
    ) {

        throw new Error(
            `ScienceBlogValidator 실패: ${result.errors.join(" / ")}`
        );

    }


    return result;

}


export {
    validateScienceBlog
};


export default {

    validateScienceBlog,

    assertValidScienceBlog

};
