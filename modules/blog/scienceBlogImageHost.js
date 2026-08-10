/*
=========================================================
ShortsAI Science Blog Factory
SCIENCE BLOG IMAGE HOST v1
=========================================================

역할
- Science Blog AI가 생성한 imageQueries 사용
- 기존 이미지 검색 시스템 사용
- 로컬 이미지가 있으면 Cloudinary 업로드
- HTTP/HTTPS 이미지면 그대로 사용
- Cloudinary에서는 science 전용 경로 사용

Cloudinary
    ↓
shortsai/blog/science/...

중요
- 쇼핑 Blog Image Host와 분리
- 원본 product 수정 금지
- 쇼핑 이미지 경로와 충돌 금지
- Blogger에는 HTTPS URL만 전달
=========================================================
*/

import "dotenv/config";

import fs from "fs";
import path from "path";
import crypto from "crypto";

import {
    v2 as cloudinary
} from "cloudinary";

import {
    searchImage
} from "../image/search.js";

function requiredEnv(name) {

    const value =
        String(
            process.env[name] || ""
        ).trim();

    if (!value) {

        throw new Error(
            `ScienceBlogImageHost: ${name}이 없습니다.`
        );

    }

    return value;

}

function configureCloudinary() {

    cloudinary.config({

        cloud_name:
            requiredEnv(
                "CLOUDINARY_CLOUD_NAME"
            ),

        api_key:
            requiredEnv(
                "CLOUDINARY_API_KEY"
            ),

        api_secret:
            requiredEnv(
                "CLOUDINARY_API_SECRET"
            ),

        secure: true

    });

}

function isHttpUrl(value = "") {

    return /^https?:\/\//i.test(
        String(value).trim()
    );

}

function localImagePath(image) {

    const value =
        String(
            image || ""
        ).trim();

    if (!value) {

        return null;

    }

    if (
        value.startsWith(
            "/media/"
        )
    ) {

        return path.resolve(
            value.replace(
                /^\/+/,
                ""
            )
        );

    }

    if (
        value.startsWith(
            "media/"
        )
    ) {

        return path.resolve(
            value
        );

    }

    if (
        path.isAbsolute(
            value
        )
    ) {

        return value;

    }

    return path.resolve(
        value
    );

}

function buildPublicId(
    topic,
    file
) {

    const topicId =
        String(
            topic || "science"
        )
            .replace(
                /[^a-zA-Z0-9_-]/g,
                "_"
            )
            .slice(
                0,
                80
            );

    const stat =
        fs.statSync(
            file
        );

    const hash =
        crypto
            .createHash(
                "sha1"
            )
            .update(
                [
                    path.resolve(file),
                    stat.size,
                    Math.floor(
                        stat.mtimeMs
                    )
                ].join("|")
            )
            .digest(
                "hex"
            )
            .slice(
                0,
                16
            );

    return (
        `shortsai/blog/science/` +
        `${topicId}_${hash}`
    );

}

async function findExistingImage(
    publicId
) {

    try {

        const resource =
            await cloudinary.api.resource(
                publicId,
                {
                    resource_type:
                        "image"
                }
            );

        if (
            resource?.secure_url
        ) {

            return resource;

        }

    }
    catch (error) {

        const httpCode =
            error?.error?.http_code ??
            error?.http_code ??
            error?.response?.status;

        if (
            Number(httpCode) === 404
        ) {

            return null;

        }

        throw error;

    }

    return null;

}

async function uploadImage(
    topic,
    image
) {

    const value =
        String(
            image || ""
        ).trim();

    if (!value) {

        return null;

    }

    /*
    이미 HTTPS/HTTP 이미지면
    Cloudinary 재업로드를 하지 않는다.
    */

    if (
        isHttpUrl(
            value
        )
    ) {

        return value;

    }

    const file =
        localImagePath(
            value
        );

    if (
        !file ||
        !fs.existsSync(
            file
        )
    ) {

        throw new Error(
            `ScienceBlogImageHost: 이미지 파일을 찾을 수 없습니다: ${value}`
        );

    }

    const publicId =
        buildPublicId(
            topic,
            file
        );

    const existing =
        await findExistingImage(
            publicId
        );

    if (
        existing?.secure_url
    ) {

        console.log(
            `[ScienceBlogImageHost] CACHE : ${path.basename(file)}`
        );

        return existing.secure_url;

    }

    console.log(
        `[ScienceBlogImageHost] UPLOAD : ${path.basename(file)}`
    );

    const result =
        await cloudinary.uploader.upload(
            file,
            {

                public_id:
                    publicId,

                resource_type:
                    "image",

                overwrite:
                    false,

                unique_filename:
                    false,

                use_filename:
                    false

            }
        );

    const secureUrl =
        String(
            result?.secure_url || ""
        ).trim();

    if (!secureUrl) {

        throw new Error(
            `ScienceBlogImageHost: Cloudinary URL 생성 실패: ${value}`
        );

    }

    console.log(
        `[ScienceBlogImageHost] OK : ${secureUrl}`
    );

    return secureUrl;

}

/*
=========================================================
MAIN
=========================================================
*/

export async function prepareScienceBlogImages(
    topic,
    imageQueries = []
) {

    const queries =
        Array.isArray(
            imageQueries
        )
            ? imageQueries
                .filter(Boolean)
                .slice(0, 2)
            : [];

    if (!queries.length) {

        console.log(
            "[ScienceBlogImageHost] IMAGE : 0"
        );

        return [];

    }

    configureCloudinary();

    const hostedImages = [];

    for (
        let index = 0;
        index < queries.length;
        index++
    ) {

        const keyword =
            String(
                queries[index]
            ).trim();

        if (!keyword) {

            continue;

        }

        console.log(
            `[ScienceBlogImageHost] SEARCH ${index + 1}/${queries.length} : ${keyword}`
        );

        try {

            const candidate =
                await searchImage(
                    keyword,
                    {
                        searchSubject:
                            keyword,
                        searchHint:
                            "science blog"
                    }
                );

            if (!candidate) {

                console.log(
                    `[ScienceBlogImageHost] SEARCH FAIL : ${keyword}`
                );

                continue;

            }

            const imageUrl =
                String(
                    candidate.url || ""
                ).trim();

            if (!imageUrl) {

                continue;

            }

            if (
                isHttpUrl(
                    imageUrl
                )
            ) {

                hostedImages.push(
                    imageUrl
                );

                console.log(
                    `[ScienceBlogImageHost] HTTPS : ${imageUrl}`
                );

                continue;

            }

            const hosted =
                await uploadImage(
                    topic,
                    imageUrl
                );

            if (hosted) {

                hostedImages.push(
                    hosted
                );

            }

        }
        catch (error) {

            console.error(
                `[ScienceBlogImageHost] FAIL : ${keyword}`,
                error?.message || error
            );

        }

    }

    console.log(
        `[ScienceBlogImageHost] COMPLETE : ${hostedImages.length}/${queries.length}`
    );

    return hostedImages;

}

export default {
    prepareScienceBlogImages
};
