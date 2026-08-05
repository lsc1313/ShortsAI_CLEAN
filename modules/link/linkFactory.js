/*
=========================================================
ShortsAI Link Factory
MAIN FACTORY v2
=========================================================

PIPELINE

Manager Product
    ↓
Cloudinary Image Host
    ↓
Link Record Store
    ↓
Link HTML
    ↓
public/shop/index.html

역할

- 실제 제작 성공 상품을 Link Record에 기록
- 상품 이미지를 Cloudinary HTTPS URL로 변환
- Link Record에는 외부에서 접근 가능한 HTTPS 이미지 저장
- 모바일 상품 링크 페이지 자동 재생성

중요

- 기존 BlogImageHost를 재사용한다.
- 원본 Product DB는 수정하지 않는다.
- 원본 product.images도 수정하지 않는다.
- AI 호출 없음
=========================================================
*/

import fs from "fs";
import path from "path";

import {
    addLinkRecord,
    getLinkRecords
} from "./linkRecordStore.js";

import {
    createLinkHTML
} from "./linkTemplate.js";

import {
    prepareBlogProductImages
} from "../blog/blogImageHost.js";


const OUTPUT_DIR =
    path.resolve(
        "public/shop"
    );


const OUTPUT_FILE =
    path.join(
        OUTPUT_DIR,
        "index.html"
    );


function ensureOutput() {

    if (
        !fs.existsSync(
            OUTPUT_DIR
        )
    ) {

        fs.mkdirSync(
            OUTPUT_DIR,
            {
                recursive: true
            }
        );

    }

}


export async function createLinkPage(
    product
) {

    console.log(
        "[LinkFactory] START"
    );


    if (!product) {

        throw new Error(
            "LinkFactory: 상품 정보가 없습니다."
        );

    }


    if (!product.partnerUrl) {

        throw new Error(
            "LinkFactory: 파트너스 링크가 없습니다."
        );

    }


    console.log(
        `[LinkFactory] PRODUCT : ${product.name || ""}`
    );


    /*
    =====================================================
    STEP 1
    IMAGE HOST

    Blog Factory에서 검증된
    Cloudinary 이미지 호스팅 로직을 재사용한다.

    반환값은 복제 객체이므로
    원본 Product DB는 변경되지 않는다.
    =====================================================
    */

    console.log(
        "[LinkFactory] IMAGE HOST"
    );


    const linkProduct =
        await prepareBlogProductImages(
            product
        );


    console.log(
        `[LinkFactory] HOSTED IMAGE : ${
            Array.isArray(linkProduct.images)
                ? linkProduct.images.length
                : 0
        }`
    );


    /*
    =====================================================
    STEP 2
    LINK RECORD

    Link Record에는
    Cloudinary HTTPS 이미지가 저장된다.
    =====================================================
    */

    const record =
        addLinkRecord(
            linkProduct
        );


    const records =
        getLinkRecords();


    /*
    =====================================================
    STEP 3
    HTML
    =====================================================
    */

    const html =
        createLinkHTML({
            records
        });


    /*
    =====================================================
    STEP 4
    OUTPUT
    =====================================================
    */

    ensureOutput();


    fs.writeFileSync(
        OUTPUT_FILE,
        html,
        "utf8"
    );


    console.log(
        `[LinkFactory] RECORDS : ${records.length}`
    );


    console.log(
        `[LinkFactory] OUTPUT : ${OUTPUT_FILE}`
    );


    console.log(
        "[LinkFactory] COMPLETE"
    );


    return {

        success:
            true,

        record,

        /*
        Manager에서 recordCount를 읽으므로
        명확한 필드를 제공한다.
        */

        recordCount:
            records.length,

        /*
        기존 코드 호환성도 유지한다.
        */

        records:
            records.length,

        html,

        output:
            OUTPUT_FILE,

        localPath:
            "/shop/"

    };

}


export default {

    createLinkPage

};
