/*
=========================================================
ShortsAI
CLOUDFLARE PAGES DIRECT DEPLOY
=========================================================

목적

public/shop
    ↓
Cloudflare Pages Direct Upload
    ↓
shortsai-shop.pages.dev

Wrangler 사용 없음
GitHub 사용 없음

=========================================================
*/

import fs from "fs";
import path from "path";

import {
    blake3
} from "@noble/hashes/blake3.js";


const API_BASE =
    "https://api.cloudflare.com/client/v4";


const DEFAULT_PROJECT =
    "shortsai-shop";


const DEFAULT_BRANCH =
    "main";


/*
=========================================================
UTIL
=========================================================
*/

function bytesToHex(bytes) {

    return Array.from(bytes)
        .map(
            value =>
                value
                    .toString(16)
                    .padStart(2, "0")
        )
        .join("");

}


function getMimeType(file) {

    const ext =
        path.extname(file)
            .toLowerCase();

    switch (ext) {

        case ".html":
            return "text/html;charset=UTF-8";

        case ".css":
            return "text/css;charset=UTF-8";

        case ".js":
            return "application/javascript;charset=UTF-8";

        case ".json":
            return "application/json;charset=UTF-8";

        case ".txt":
            return "text/plain;charset=UTF-8";

        case ".svg":
            return "image/svg+xml";

        case ".png":
            return "image/png";

        case ".jpg":
        case ".jpeg":
            return "image/jpeg";

        case ".webp":
            return "image/webp";

        case ".gif":
            return "image/gif";

        case ".ico":
            return "image/x-icon";

        default:
            return "application/octet-stream";

    }

}


/*
=========================================================
CLOUDFLARE PAGES HASH

Wrangler-compatible Pages asset hash

BLAKE3(
    base64(file contents) + extension-without-dot
)

앞 32 hex 사용
=========================================================
*/

function createAssetHash(
    buffer,
    file
) {

    const base64 =
        buffer.toString("base64");

    const extension =
        path.extname(file)
            .replace(/^\./, "");

    const input =
        Buffer.from(
            base64 + extension,
            "utf8"
        );

    const digest =
        blake3(input);

    return bytesToHex(digest)
        .slice(0, 32);

}


/*
=========================================================
FILES
=========================================================
*/

function collectFiles(
    directory,
    root = directory
) {

    const output = [];

    const entries =
        fs.readdirSync(
            directory,
            {
                withFileTypes: true
            }
        );

    for (const entry of entries) {

        const absolute =
            path.join(
                directory,
                entry.name
            );

        if (entry.isDirectory()) {

            output.push(
                ...collectFiles(
                    absolute,
                    root
                )
            );

            continue;

        }

        if (!entry.isFile()) {
            continue;
        }

        const relative =
            path.relative(
                root,
                absolute
            )
            .split(path.sep)
            .join("/");

        const route =
            "/" + relative;

        const buffer =
            fs.readFileSync(
                absolute
            );

        const hash =
            createAssetHash(
                buffer,
                absolute
            );

        output.push({

            absolute,

            relative,

            route,

            hash,

            buffer,

            size:
                buffer.length,

            contentType:
                getMimeType(
                    absolute
                )

        });

    }

    return output;

}


/*
=========================================================
HTTP
=========================================================
*/

async function parseResponse(
    response,
    label
) {

    const text =
        await response.text();

    let data = null;

    try {

        data =
            text
                ? JSON.parse(text)
                : {};

    }
    catch {

        throw new Error(
            `${label}: HTTP ${response.status}: ${text.slice(0, 500)}`
        );

    }

    if (
        !response.ok ||
        data?.success === false
    ) {

        throw new Error(
            `${label}: HTTP ${response.status}: ${
                JSON.stringify(
                    data?.errors ||
                    data
                )
            }`
        );

    }

    return data;

}


/*
=========================================================
MAIN
=========================================================
*/

export async function deployPages({

    directory =
        path.resolve(
            "public/shop"
        ),

    accountId =
        process.env.CLOUDFLARE_ACCOUNT_ID,

    apiToken =
        process.env.CLOUDFLARE_API_TOKEN,

    project =
        process.env.CLOUDFLARE_PAGES_PROJECT ||
        DEFAULT_PROJECT,

    branch =
        DEFAULT_BRANCH

} = {}) {

    console.log(
        "[CloudflareDeploy] START"
    );


    if (!accountId) {

        throw new Error(
            "Cloudflare Account ID가 없습니다."
        );

    }


    if (!apiToken) {

        throw new Error(
            "Cloudflare API Token이 없습니다."
        );

    }


    if (
        !fs.existsSync(
            directory
        )
    ) {

        throw new Error(
            `배포 폴더가 없습니다: ${directory}`
        );

    }


    /*
    =====================================================
    FILE SCAN
    =====================================================
    */

    const assets =
        collectFiles(
            directory
        );


    if (!assets.length) {

        throw new Error(
            "배포할 파일이 없습니다."
        );

    }


    console.log(
        `[CloudflareDeploy] FILES : ${assets.length}`
    );


    for (const asset of assets) {

        console.log(
            `[CloudflareDeploy] ASSET : ${asset.route}`
        );

    }


    const manifest = {};

    for (const asset of assets) {

        manifest[
            asset.route
        ] =
            asset.hash;

    }


    /*
    =====================================================
    STEP 1
    UPLOAD TOKEN
    =====================================================
    */

    console.log(
        "[CloudflareDeploy] STEP 1 : UPLOAD TOKEN"
    );


    const tokenResponse =
        await fetch(
            `${API_BASE}/accounts/${accountId}/pages/projects/${project}/upload-token`,
            {
                method:
                    "GET",

                headers: {

                    Authorization:
                        `Bearer ${apiToken}`

                }
            }
        );


    const tokenData =
        await parseResponse(
            tokenResponse,
            "UPLOAD TOKEN"
        );


    const uploadToken =
        tokenData?.result?.jwt;


    if (!uploadToken) {

        throw new Error(
            "Cloudflare Upload JWT가 없습니다."
        );

    }


    /*
    =====================================================
    STEP 2
    CHECK MISSING
    =====================================================
    */

    console.log(
        "[CloudflareDeploy] STEP 2 : CHECK MISSING"
    );


    const hashes =
        assets.map(
            asset =>
                asset.hash
        );


    const missingResponse =
        await fetch(
            `${API_BASE}/pages/assets/check-missing`,
            {
                method:
                    "POST",

                headers: {

                    Authorization:
                        `Bearer ${uploadToken}`,

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify({
                        hashes
                    })
            }
        );


    const missingData =
        await parseResponse(
            missingResponse,
            "CHECK MISSING"
        );


    const missing =
        Array.isArray(
            missingData?.result
        )
            ? missingData.result
            : Array.isArray(
                missingData?.result?.missing
            )
                ? missingData.result.missing
                : [];


    console.log(
        `[CloudflareDeploy] MISSING : ${missing.length}`
    );


    /*
    =====================================================
    STEP 3
    UPLOAD MISSING ASSETS
    =====================================================
    */

    if (missing.length > 0) {

        console.log(
            "[CloudflareDeploy] STEP 3 : UPLOAD"
        );


        const missingSet =
            new Set(
                missing
            );


        const uploadAssets =
            assets
                .filter(
                    asset =>
                        missingSet.has(
                            asset.hash
                        )
                )
                .map(
                    asset => ({

                        key:
                            asset.hash,

                        value:
                            asset.buffer
                                .toString(
                                    "base64"
                                ),

                        metadata: {

                            contentType:
                                asset.contentType

                        },

                        base64:
                            true

                    })
                );


        const uploadResponse =
            await fetch(
                `${API_BASE}/pages/assets/upload`,
                {
                    method:
                        "POST",

                    headers: {

                        Authorization:
                            `Bearer ${uploadToken}`,

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            uploadAssets
                        )
                }
            );


        await parseResponse(
            uploadResponse,
            "ASSET UPLOAD"
        );


        /*
        =================================================
        STEP 4
        UPSERT HASHES
        =================================================
        */

        console.log(
            "[CloudflareDeploy] STEP 4 : UPSERT HASHES"
        );


        const upsertResponse =
            await fetch(
                `${API_BASE}/pages/assets/upsert-hashes`,
                {
                    method:
                        "POST",

                    headers: {

                        Authorization:
                            `Bearer ${uploadToken}`,

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({
                            hashes:
                                missing
                        })
                }
            );


        await parseResponse(
            upsertResponse,
            "UPSERT HASHES"
        );

    }
    else {

        console.log(
            "[CloudflareDeploy] STEP 3/4 : SKIP - ALL ASSETS EXIST"
        );

    }


    /*
    =====================================================
    STEP 5
    CREATE DEPLOYMENT
    =====================================================
    */

    console.log(
        "[CloudflareDeploy] STEP 5 : DEPLOYMENT"
    );


    const form =
        new FormData();


    form.append(
        "manifest",
        JSON.stringify(
            manifest
        )
    );


    form.append(
        "branch",
        branch
    );


    form.append(
        "commit_dirty",
        "true"
    );


    form.append(
        "commit_message",
        "ShortsAI automatic shop update"
    );


    const deploymentResponse =
        await fetch(
            `${API_BASE}/accounts/${accountId}/pages/projects/${project}/deployments`,
            {
                method:
                    "POST",

                headers: {

                    Authorization:
                        `Bearer ${apiToken}`

                },

                body:
                    form
            }
        );


    const deploymentData =
        await parseResponse(
            deploymentResponse,
            "DEPLOYMENT"
        );


    const deployment =
        deploymentData?.result ||
        {};


    console.log(
        "[CloudflareDeploy] COMPLETE"
    );

    console.log(
        `[CloudflareDeploy] ID  : ${deployment.id || ""}`
    );

    console.log(
        `[CloudflareDeploy] URL : ${deployment.url || ""}`
    );


    return {

        success:
            true,

        project,

        fileCount:
            assets.length,

        uploaded:
            missing.length,

        deploymentId:
            deployment.id ||
            null,

        deploymentUrl:
            deployment.url ||
            null,

        productionUrl:
            `https://${project}.pages.dev`

    };

}


export default {
    deployPages
};
