/*
=========================================================
ShortsAI Science Blog Factory
SCIENCE BLOG FACTORY v1
=========================================================

PIPELINE

completedTopic
    ↓
Science Blog AI
    ↓
Science Blog Image Host
    ↓
Science Blog Template
    ↓
Blogger
=========================================================
*/

import {
    createScienceBlogContent
} from "./scienceBlogAI.js";

import {
    prepareScienceBlogImages
} from "./scienceBlogImageHost.js";

import {
    createScienceBlogHTML
} from "./scienceBlogTemplate.js";

import {
    publishBlog
} from "./bloggerClient.js";

import {
    assertValidScienceBlog
} from "./scienceBlogValidator.js";

function cleanText(
    value = ""
) {

    return String(
        value ?? ""
    ).trim();

}


/*
=========================================================
MAIN
=========================================================
*/

export async function createScienceBlog(
    completedTopic,
    options = {}
) {

    const topic =
        cleanText(
            completedTopic
        );

    if (!topic) {

        throw new Error(
            "ScienceBlogFactory: completedTopic이 없습니다."
        );

    }

    console.log(
        "========================================="
    );

    console.log(
        "[ScienceBlogFactory] START"
    );

    console.log(
        `[ScienceBlogFactory] TOPIC : ${topic}`
    );


    /*
    =====================================================
    STEP 1
    SCIENCE BLOG AI
    =====================================================
    */

    console.log(
        "[ScienceBlogFactory] AI CONTENT"
    );

    const content =
        await createScienceBlogContent(
            topic
        );


    if (
        !content ||
        !content.title
    ) {

        throw new Error(
            "ScienceBlogFactory: 블로그 콘텐츠 생성 실패"
        );

    }


    console.log(
        `[ScienceBlogFactory] TITLE : ${content.title}`
    );


    /*
    =====================================================
    STEP 2
    SCIENCE BLOG IMAGE HOST
    =====================================================
    */

    console.log(
        "[ScienceBlogFactory] IMAGE HOST"
    );

    const images =
        await prepareScienceBlogImages(
            topic,
            content.imageQueries
        );


    console.log(
        `[ScienceBlogFactory] IMAGES : ${images.length}`
    );


    /*
    =====================================================
    STEP 3
    HTML
    =====================================================
    */

    console.log(
        "[ScienceBlogFactory] HTML"
    );

    const html =
        createScienceBlogHTML({

            content,

            images

        });


    if (!html) {

        throw new Error(
            "ScienceBlogFactory: HTML 생성 실패"
        );

    }

console.log(
    "[ScienceBlogFactory] VALIDATOR"
);

const validation =
    assertValidScienceBlog({

        content,

        html,

        images

    });

console.log(
    `[ScienceBlogFactory] VALIDATOR PASS : SECTION ${validation.stats.sectionCount} / FAQ ${validation.stats.faqCount} / IMAGE ${validation.stats.imageCount} / HTML IMAGE ${validation.stats.htmlImageCount}`
);

if (
    validation.warnings.length > 0
) {

    console.log(
        "[ScienceBlogFactory] VALIDATOR WARNING :",
        validation.warnings.join(
            " / "
        )
    );

}


    /*
    =====================================================
    STEP 4
    BLOGGER
    =====================================================

    기본:
        DRAFT

    options.publish === true:
        PUBLISH

    =====================================================
    */

    const publish =
        options.publish === true;


    console.log(
        `[ScienceBlogFactory] BLOGGER : ${
            publish
                ? "PUBLISH"
                : "DRAFT"
        }`
    );


    const publishResult =
        await publishBlog({

            title:
                content.title,

            html,

            tags:
                Array.isArray(
                    content.tags
                )
                    ? content.tags
                    : [],

            publish,

            blogType:
                "science"

        });


    /*
    =====================================================
    RESULT
    =====================================================
    */

    console.log(
        `[ScienceBlogFactory] COMPLETE : ${
            publishResult?.mode ||
            "UNKNOWN"
        }`
    );


    console.log(
        `[ScienceBlogFactory] POST ID : ${
            publishResult?.postId ||
            "NONE"
        }`
    );


    if (
        publishResult?.url
    ) {

        console.log(
            `[ScienceBlogFactory] URL : ${publishResult.url}`
        );

    }


    console.log(
        "========================================="
    );


return {
    success:
        publishResult?.success === true,

    topic,

    content,

    images,

    html,

    validation,

    publish:
        publishResult
};

}

export default {

    createScienceBlog

};
