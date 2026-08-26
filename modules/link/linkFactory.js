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

import {
    deployPages
} from "../cloudflare/pagesDeploy.js";


const OUTPUT_DIR =
    path.resolve(
        "public/shop"
    );


const OUTPUT_FILE =
    path.join(
        OUTPUT_DIR,
        "index.html"
    );

const CLOUDFLARE_TOKEN_FILE =
    path.resolve(
        ".runtime/cloudflare/api_token"
    );


const CLOUDFLARE_ACCOUNT_ID =
    "077453530769859915f71686765e42ef";


const CLOUDFLARE_PROJECT =
    "shortsai-shop";


async function deployShopPage() {

    /*
    =====================================================
    CLOUDFLARE DEPLOY

    Link Page 생성과 Cloudflare 배포는 분리한다.

    배포 실패가 발생해도
    LinkFactory 자체 성공이나
    쇼츠 제작 성공을 취소하지 않는다.
    =====================================================
    */

    try {

        if (
            !fs.existsSync(
                CLOUDFLARE_TOKEN_FILE
            )
        ) {

            console.error(
                "[LinkFactory] Cloudflare Token 없음 - 배포 생략"
            );

            return {
                success: false,
                skipped: true,
                reason: "TOKEN_NOT_FOUND"
            };

        }


        const apiToken =
            fs.readFileSync(
                CLOUDFLARE_TOKEN_FILE,
                "utf8"
            )
            .trim();


        if (!apiToken) {

            console.error(
                "[LinkFactory] Cloudflare Token 비어 있음 - 배포 생략"
            );

            return {
                success: false,
                skipped: true,
                reason: "TOKEN_EMPTY"
            };

        }


        console.log(
            "[LinkFactory] CLOUDFLARE DEPLOY START"
        );


        const result =
            await deployPages({

                directory:
                    OUTPUT_DIR,

                accountId:
                    CLOUDFLARE_ACCOUNT_ID,

                apiToken,

                project:
                    CLOUDFLARE_PROJECT,

                branch:
                    "main"

            });


        console.log(
            "[LinkFactory] CLOUDFLARE DEPLOY COMPLETE"
        );

        console.log(
            `[LinkFactory] LIVE : ${result.productionUrl}`
        );


        return result;

    }
    catch (error) {

        console.error(
            "[LinkFactory] CLOUDFLARE DEPLOY FAILED:",
            error?.message || error
        );


        return {

            success:
                false,

            error:
                error?.message ||
                String(error)

        };

    }

}



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

    const generatedHTML =
        createLinkHTML({
            records
        });

    /*
    =====================================================
    ALL PRODUCTS UPDATE

    일반상품 제작 시:
    - 기존 HOTDEAL 영역은 그대로 유지
    - ALL_PRODUCTS 영역만 최신 일반상품 목록으로 교체
    =====================================================
    */

    let html = generatedHTML;

    if (fs.existsSync(OUTPUT_FILE)) {

        const currentHTML =
            fs.readFileSync(
                OUTPUT_FILE,
                "utf8"
            );

        const allStart =
            "<!-- ALL_PRODUCTS_START -->";

        const allEnd =
            "<!-- ALL_PRODUCTS_END -->";

        const generatedGridStart =
            generatedHTML.indexOf("<section");

        const generatedGridEnd =
            generatedHTML.indexOf(
                "</section>",
                generatedGridStart
            );

        if (
            currentHTML.includes(allStart) &&
            currentHTML.includes(allEnd) &&
            generatedGridStart >= 0 &&
            generatedGridEnd >= 0
        ) {

            const newProductGrid =
                generatedHTML.slice(
                    generatedGridStart,
                    generatedGridEnd +
                        "</section>".length
                );

            const before =
                currentHTML.split(allStart)[0];

            const after =
                currentHTML.split(allEnd)[1];

            html =
                before +
                allStart +
                "\n" +
                newProductGrid +
                "\n" +
                allEnd +
                after;
        }
    }


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


    /*
    =====================================================
    STEP 5
    CLOUDFLARE AUTO DEPLOY
    =====================================================
    */

    const deployment =
        await deployShopPage();


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

        deployment,

        localPath:
            "/shop/"

    };

}


export default {

    createLinkPage

};
