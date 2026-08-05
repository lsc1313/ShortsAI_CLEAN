/*
=========================================================
ShortsAI Blog Factory
MAIN FACTORY v3
=========================================================

PIPELINE

PRODUCT
    ↓
BLOG AI
    ↓
CLOUDINARY IMAGE HOST
    ↓
BLOG HTML
    ↓
BLOGGER
    ↓
BLOG RECORD

중요

원본 Coupang Product DB는 변경하지 않는다.
Blog용 product 복제본에서만
Cloudinary HTTPS 이미지 URL을 사용한다.
=========================================================
*/

import {
    createBlogContent
} from "./blogAI.js";

import {
    createBlogHTML
} from "./blogTemplate.js";

import {
    publishBlog
} from "./bloggerClient.js";

import {
    addBlogRecord
} from "./blogRecordStore.js";

import {
    prepareBlogProductImages
} from "./blogImageHost.js";


import {
    assertValidBlog
} from "./blogValidator.js";



export async function createBlog(
    product,
    options = {}
) {

    console.log(
        "[BlogFactory] START"
    );


    if (!product) {

        throw new Error(
            "BlogFactory: 상품 정보가 없습니다."
        );

    }


    if (!product.partnerUrl) {

        throw new Error(
            "BlogFactory: 파트너스 링크가 없습니다."
        );

    }


    console.log(
        `[BlogFactory] PRODUCT : ${product.name}`
    );


    /*
    =====================================================
    STEP 1
    AI BLOG CONTENT
    =====================================================
    */

    console.log(
        "[BlogFactory] AI CONTENT"
    );


    const content =
        await createBlogContent(
            product
        );


    /*
    =====================================================
    STEP 2
    BLOG IMAGE HOSTING
    =====================================================
    */

    console.log(
        "[BlogFactory] IMAGE HOST"
    );


    const blogProduct =
        await prepareBlogProductImages(
            product
        );


    /*
    =====================================================
    STEP 3
    HTML
    =====================================================
    */

    console.log(
        "[BlogFactory] HTML"
    );


    const html =
        createBlogHTML({

            product:
                blogProduct,

            content

        });


    /*
    =====================================================
    STEP 4
    BLOGGER

    기본은 DRAFT.

    createBlog(product, {
        publish: true
    })

    로 명시했을 때만 공개한다.
    =====================================================
    */

    /*
    =====================================================
    STEP 4
    VALIDATOR

    AI 호출 없음.
    Blogger 전송 직전 로컬 규칙으로만 검사한다.
    =====================================================
    */

    console.log(
        "[BlogFactory] VALIDATOR"
    );


    const validation =
        assertValidBlog({

            product,

            blogProduct,

            content,

            html

        });


    console.log(
        `[BlogFactory] VALIDATOR PASS : IMAGE ${validation.stats.imageCount} / HTML IMAGE ${validation.stats.htmlImageCount}`
    );


    if (validation.warnings.length > 0) {

        console.log(
            "[BlogFactory] VALIDATOR WARNING :",
            validation.warnings.join(" / ")
        );

    }


    console.log(
        "[BlogFactory] BLOGGER"
    );


    const publishResult =
        await publishBlog({

            title:
                content.title,

            html,

            tags:
                content.tags,

            /*
            Validator를 통과한 글만 이 위치까지 도달한다.

            PASS
              → 즉시 공개 게시

            FAIL
              → assertValidBlog()에서 throw
              → Blogger API 호출 자체가 실행되지 않음

            추가 AI 호출 없음.
            */
            publish:
                true

        });


    /*
    =====================================================
    STEP 5
    RECORD
    =====================================================
    */

    const record =
        addBlogRecord({

            productId:
                product.id || null,

            productName:
                product.name || "",

            partnerUrl:
                product.partnerUrl,

            title:
                content.title,

            status:
                publishResult.success
                    ? publishResult.mode
                    : "FAILED",

            postId:
                publishResult.postId,

            url:
                publishResult.url,

            imageCount:
                Array.isArray(
                    blogProduct.images
                )
                    ? blogProduct.images.length
                    : 0

        });


    console.log(
        `[BlogFactory] COMPLETE : ${content.title}`
    );


    return {

        success:
            true,

        /*
        기존 호출부 호환성을 위해
        원본 product를 유지한다.
        */

        product,

        /*
        실제 Blogger HTML 제작에 사용된
        Cloudinary 적용 상품.
        */

        blogProduct,

        content,

        html,

        validation,

        publish:
            publishResult,

        record

    };

}


export default {

    createBlog

};
