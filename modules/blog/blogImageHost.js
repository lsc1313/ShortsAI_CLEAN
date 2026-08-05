/*
=========================================================
ShortsAI Blog Factory
BLOG IMAGE HOST
=========================================================

역할

로컬 상품 이미지
/media/products/...

        ↓

Cloudinary

        ↓

https://res.cloudinary.com/...

        ↓

Blogger HTML

중요

- 원본 productStore DB는 수정하지 않는다.
- 쇼츠 제작용 product.images도 수정하지 않는다.
- Blog Factory에서만 HTTPS 이미지 배열을 사용한다.
- 같은 로컬 파일은 deterministic public_id를 사용한다.
- overwrite:false 로 중복 업로드를 방지한다.
=========================================================
*/

import "dotenv/config";

import fs from "fs";
import path from "path";
import crypto from "crypto";

import {
    v2 as cloudinary
} from "cloudinary";


function requiredEnv(
    name
) {

    const value =
        String(
            process.env[name] || ""
        ).trim();


    if (!value) {

        throw new Error(
            `BlogImageHost: ${name}이 없습니다.`
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

        secure:
            true

    });

}


function isHttpUrl(
    value = ""
) {

    return (
        /^https?:\/\//i.test(
            String(value).trim()
        )
    );

}


function localImagePath(
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
    -----------------------------------------------------
    /media/products/...
    -----------------------------------------------------
    */

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


    /*
    -----------------------------------------------------
    media/products/...
    -----------------------------------------------------
    */

    if (
        value.startsWith(
            "media/"
        )
    ) {

        return path.resolve(
            value
        );

    }


    /*
    -----------------------------------------------------
    절대 로컬 경로
    -----------------------------------------------------
    */

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
    product,
    file
) {

    const productId =
        String(
            product?.id ||
            product?.name ||
            "product"
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


    /*
    파일 경로 + 크기 + 수정시각을 사용한다.

    동일 파일:
        동일 public_id

    이미지가 변경됨:
        새 public_id
    */

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
        `shortsai/blog/products/` +
        `${productId}_${hash}`
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


        /*
        Cloudinary에 없으면 정상적인 cache miss
        */

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
    product,
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
    이미 외부 HTTPS/HTTP 이미지면 그대로 사용한다.
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
            `BlogImageHost: 이미지 파일을 찾을 수 없습니다: ${value}`
        );

    }


    const publicId =
        buildPublicId(
            product,
            file
        );


    /*
    =====================================================
    CLOUDINARY CACHE CHECK
    =====================================================
    */

    const existing =
        await findExistingImage(
            publicId
        );


    if (
        existing?.secure_url
    ) {

        console.log(
            `[BlogImageHost] CACHE : ${path.basename(file)}`
        );

        return existing.secure_url;

    }


    /*
    =====================================================
    UPLOAD
    =====================================================
    */

    console.log(
        `[BlogImageHost] UPLOAD : ${path.basename(file)}`
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
            `BlogImageHost: Cloudinary URL 생성 실패: ${value}`
        );

    }


    console.log(
        `[BlogImageHost] OK : ${secureUrl}`
    );


    return secureUrl;

}


export async function prepareBlogProductImages(
    product
) {

    if (!product) {

        throw new Error(
            "BlogImageHost: 상품 정보가 없습니다."
        );

    }


    const images =
        Array.isArray(
            product.images
        )
            ? product.images
                .filter(Boolean)
            : [];


    /*
    이미지가 없는 상품은 그대로 통과
    */

    if (!images.length) {

        console.log(
            "[BlogImageHost] IMAGE : 0"
        );

        return {
            ...product,
            images: []
        };

    }


    configureCloudinary();


    console.log(
        `[BlogImageHost] IMAGE : ${images.length}`
    );


    /*
    순차 업로드

    휴대폰/Termux 환경에서 과도한 동시 요청을 피하고
    로그 순서를 명확하게 유지한다.
    */

    const hostedImages = [];


    for (
        let index = 0;
        index < images.length;
        index++
    ) {

        const image =
            images[index];


        console.log(
            `[BlogImageHost] ${index + 1}/${images.length}`
        );


        const hosted =
            await uploadImage(
                product,
                image
            );


        if (hosted) {

            hostedImages.push(
                hosted
            );

        }

    }


    console.log(
        `[BlogImageHost] COMPLETE : ${hostedImages.length}/${images.length}`
    );


    return {

        ...product,

        /*
        Blog 전용 복제 객체에만 HTTPS URL을 넣는다.
        원본 product 객체와 DB는 변경하지 않는다.
        */

        images:
            hostedImages

    };

}


export default {

    prepareBlogProductImages

};
