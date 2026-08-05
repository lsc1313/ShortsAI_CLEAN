/*
=========================================================
ShortsAI Link Factory
LINK RECORD STORE v1
=========================================================

Link Factory 전용 DB.

원칙
- Product Store 직접 조회 금지
- Manager가 전달한 상품만 저장
- 실제 제작 성공 상품만 기록
- 같은 상품은 중복 생성하지 않고 최신 제작 시각 갱신
=========================================================
*/

import fs from "fs";
import path from "path";

const DATA_DIR =
    path.resolve(
        "data/link"
    );

const RECORD_FILE =
    path.join(
        DATA_DIR,
        "records.json"
    );


function ensureStore() {

    if (!fs.existsSync(DATA_DIR)) {

        fs.mkdirSync(
            DATA_DIR,
            {
                recursive: true
            }
        );

    }

    if (!fs.existsSync(RECORD_FILE)) {

        fs.writeFileSync(
            RECORD_FILE,
            JSON.stringify(
                [],
                null,
                2
            ),
            "utf8"
        );

    }

}


function readRecords() {

    ensureStore();

    try {

        const raw =
            fs.readFileSync(
                RECORD_FILE,
                "utf8"
            );

        const data =
            JSON.parse(raw);

        return Array.isArray(data)
            ? data
            : [];

    }
    catch {

        return [];

    }

}


function writeRecords(
    records
) {

    ensureStore();

    fs.writeFileSync(
        RECORD_FILE,
        JSON.stringify(
            records,
            null,
            2
        ),
        "utf8"
    );

}


export function getLinkRecords() {

    return readRecords()
        .sort(
            (a, b) =>
                new Date(
                    b.lastProducedAt ||
                    b.createdAt ||
                    0
                ).getTime()
                -
                new Date(
                    a.lastProducedAt ||
                    a.createdAt ||
                    0
                ).getTime()
        );

}


export function addLinkRecord(
    product
) {

    if (!product) {

        throw new Error(
            "LinkRecordStore: 상품 정보가 없습니다."
        );

    }

    const productId =
        String(
            product.id || ""
        ).trim();

    const name =
        String(
            product.name || ""
        ).trim();

    const partnerUrl =
        String(
            product.partnerUrl || ""
        ).trim();

    if (!name) {

        throw new Error(
            "LinkRecordStore: 상품명이 없습니다."
        );

    }

    if (!partnerUrl) {

        throw new Error(
            "LinkRecordStore: 파트너스 링크가 없습니다."
        );

    }

    const now =
        new Date()
            .toISOString();

    const records =
        readRecords();

    /*
    동일 productId 우선.

    과거 데이터 등 productId가 없는 경우에는
    partnerUrl로 중복 판단한다.
    */

    const existingIndex =
        records.findIndex(
            item =>
                (
                    productId &&
                    item.productId === productId
                )
                ||
                (
                    item.partnerUrl === partnerUrl
                )
        );


    /*
    =====================================================
    PERMANENT IMAGE POLICY

    Link Record는 외부 공개 페이지용 영구 DB다.

    따라서:
    - /media/... 저장 금지
    - media/... 저장 금지
    - file: 저장 금지
    - HTTP 저장 금지
    - HTTPS 이미지만 저장

    Link Factory가 Cloudinary 변환을 완료한 뒤
    이 Store를 호출하는 것이 정상 경로다.
    =====================================================
    */

    const inputImages =
        Array.isArray(
            product.images
        )
            ? product.images
                .filter(Boolean)
                .map(
                    value =>
                        String(value).trim()
                )
            : [];


    const images =
        inputImages.filter(
            value =>
                /^https:\/\//i.test(
                    value
                )
        );


    if (
        inputImages.length > 0 &&
        images.length !== inputImages.length
    ) {

        throw new Error(
            "LinkRecordStore: 외부 HTTPS 이미지가 아닌 경로가 포함되어 있습니다."
        );

    }


    if (existingIndex >= 0) {

        const existing =
            records[existingIndex];

        records[existingIndex] = {

            ...existing,

            productId:
                productId ||
                existing.productId ||
                null,

            productName:
                name,

            partnerUrl,

            images:
                images.length
                    ? images
                    : (
                        Array.isArray(existing.images)
                            ? existing.images
                            : []
                    ),

            enabled:
                product.enabled !== false,

            lastProducedAt:
                now,

            productionCount:
                Number(
                    existing.productionCount || 1
                ) + 1

        };

    }
    else {

        records.push({

            id:
                `link_${Date.now()}_${Math.random()
                    .toString(36)
                    .slice(2, 8)}`,

            productId:
                productId || null,

            productName:
                name,

            partnerUrl,

            images,

            enabled:
                product.enabled !== false,

            createdAt:
                now,

            lastProducedAt:
                now,

            productionCount:
                1

        });

    }


    records.sort(
        (a, b) =>
            new Date(
                b.lastProducedAt ||
                b.createdAt ||
                0
            ).getTime()
            -
            new Date(
                a.lastProducedAt ||
                a.createdAt ||
                0
            ).getTime()
    );


    writeRecords(
        records
    );


    return getLinkRecords()[0];

}


export default {

    getLinkRecords,
    addLinkRecord

};
