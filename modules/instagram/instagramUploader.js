import fs from "fs";
import {
    v2 as cloudinary
} from "cloudinary";

/*
============================================================
ShortsAI - Instagram Reels Uploader
============================================================

Flow

local MP4
   ↓
Cloudinary temporary HTTPS video
   ↓
Instagram media container
   ↓
container status polling
   ↓
media_publish
   ↓
Reel published
   ↓
Cloudinary temporary video cleanup
============================================================
*/

const GRAPH_VERSION = "v25.0";

const GRAPH_BASE =
    `https://graph.instagram.com/${GRAPH_VERSION}`;

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));


function configureCloudinary() {

    const cloudName =
        process.env.CLOUDINARY_CLOUD_NAME;

    const apiKey =
        process.env.CLOUDINARY_API_KEY;

    const apiSecret =
        process.env.CLOUDINARY_API_SECRET;

    if (!cloudName) {
        throw new Error(
            "CLOUDINARY_CLOUD_NAME 없음"
        );
    }

    if (!apiKey) {
        throw new Error(
            "CLOUDINARY_API_KEY 없음"
        );
    }

    if (!apiSecret) {
        throw new Error(
            "CLOUDINARY_API_SECRET 없음"
        );
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
    });
}


async function graphRequest(
    path,
    {
        method = "GET",
        token,
        params = {}
    } = {}
) {

    if (!token) {
        throw new Error(
            "Instagram Access Token 없음"
        );
    }

    const url =
        new URL(`${GRAPH_BASE}/${path}`);

    const headers = {
        Authorization: `Bearer ${token}`
    };

    let body;

    if (method === "GET") {

        for (
            const [key, value]
            of Object.entries(params)
        ) {

            if (
                value !== undefined &&
                value !== null
            ) {
                url.searchParams.set(
                    key,
                    String(value)
                );
            }
        }

    } else {

        headers["Content-Type"] =
            "application/x-www-form-urlencoded";

        const form =
            new URLSearchParams();

        for (
            const [key, value]
            of Object.entries(params)
        ) {

            if (
                value !== undefined &&
                value !== null
            ) {
                form.set(
                    key,
                    String(value)
                );
            }
        }

        body = form.toString();
    }

    const response =
        await fetch(
            url,
            {
                method,
                headers,
                body
            }
        );

    const text =
        await response.text();

    let data;

    try {
        data =
            text
                ? JSON.parse(text)
                : {};
    }
    catch {
        data = {
            raw: text
        };
    }

    if (!response.ok) {

        const graphMessage =
            data?.error?.message ||
            data?.message ||
            text ||
            `HTTP ${response.status}`;

        const error =
            new Error(
                `Instagram API 오류 (${response.status}) : ${graphMessage}`
            );

        error.status =
            response.status;

        error.graph =
            data;

        throw error;
    }

    return data;
}


async function uploadTemporaryVideo(
    videoFile
) {

    configureCloudinary();

    console.log(
        "[INSTAGRAM] Cloudinary 임시 영상 업로드 시작"
    );

    const publicId =
        `shortsai_instagram_${Date.now()}`;

    const result =
        await cloudinary.uploader.upload(
            videoFile,
            {
                resource_type: "video",

                public_id: publicId,

                folder:
                    "shortsai/instagram-temp",

                overwrite: false
            }
        );

    if (!result?.secure_url) {

        throw new Error(
            "Cloudinary HTTPS video URL 생성 실패"
        );
    }

    console.log(
        "[INSTAGRAM] Cloudinary 업로드 완료"
    );

    return {
        url: result.secure_url,
        publicId: result.public_id
    };
}


async function removeTemporaryVideo(
    publicId
) {

    if (!publicId) {
        return;
    }

    try {

        configureCloudinary();

        await cloudinary.uploader.destroy(
            publicId,
            {
                resource_type: "video",
                invalidate: true
            }
        );

        console.log(
            "[INSTAGRAM] Cloudinary 임시 영상 삭제 완료"
        );

    }
    catch (error) {

        /*
        Instagram 게시 자체가 성공했다면
        Cloudinary 정리 실패 때문에 전체 업로드를
        실패 처리하지 않는다.
        */

        console.error(
            "[INSTAGRAM] Cloudinary 임시 영상 삭제 실패:",
            error?.message || error
        );
    }
}


async function createReelContainer({
    instagramUserId,
    accessToken,
    videoUrl,
    caption
}) {

    console.log(
        "[INSTAGRAM] Reels 컨테이너 생성"
    );

    const result =
        await graphRequest(
            `${instagramUserId}/media`,
            {
                method: "POST",

                token: accessToken,

                params: {
                    media_type: "REELS",
                    video_url: videoUrl,
                    caption:
                        caption || ""
                }
            }
        );

    if (!result?.id) {

        throw new Error(
            "Instagram Media Container ID 없음"
        );
    }

    console.log(
        `[INSTAGRAM] Container ID : ${result.id}`
    );

    return result.id;
}


async function waitForContainer({
    containerId,
    accessToken,

    maxAttempts = 60,
    intervalMs = 5000
}) {

    console.log(
        "[INSTAGRAM] 영상 처리 대기"
    );

    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
    ) {

        const result =
            await graphRequest(
                containerId,
                {
                    token: accessToken,

                    params: {
                        fields:
                            "status_code,status"
                    }
                }
            );

        const status =
            String(
                result?.status_code ||
                ""
            ).toUpperCase();

        console.log(
            `[INSTAGRAM] 처리 상태 ${attempt}/${maxAttempts} : ${status || "UNKNOWN"}`
        );

        if (
            status === "FINISHED"
        ) {

            return result;
        }

        if (
            status === "ERROR" ||
            status === "EXPIRED"
        ) {

            throw new Error(
                `Instagram 영상 처리 실패 : ${JSON.stringify(result)}`
            );
        }

        await sleep(
            intervalMs
        );
    }

    throw new Error(
        "Instagram 영상 처리 시간 초과"
    );
}


async function publishContainer({
    instagramUserId,
    accessToken,
    containerId
}) {

    console.log(
        "[INSTAGRAM] Reels 게시 요청"
    );

    const result =
        await graphRequest(
            `${instagramUserId}/media_publish`,
            {
                method: "POST",

                token: accessToken,

                params: {
                    creation_id:
                        containerId
                }
            }
        );

    if (!result?.id) {

        throw new Error(
            "Instagram 게시 Media ID 없음"
        );
    }

    console.log(
        `[INSTAGRAM] 게시 성공 : ${result.id}`
    );

    return result;
}


export async function uploadInstagramReel(
    videoFile,
    {
        instagramUserId,
        accessToken,
        username = "",
        caption = ""
    } = {}
) {

    if (!videoFile) {

        throw new Error(
            "Instagram 업로드 영상 경로 없음"
        );
    }

    if (!fs.existsSync(videoFile)) {

        throw new Error(
            `Instagram 업로드 영상 없음 : ${videoFile}`
        );
    }

    if (!instagramUserId) {

        throw new Error(
            "instagramUserId 없음"
        );
    }

    if (!accessToken) {

        throw new Error(
            "Instagram accessToken 없음"
        );
    }

    console.log("");
    console.log(
        "========================================="
    );
    console.log(
        " INSTAGRAM REELS UPLOAD"
    );
    console.log(
        "========================================="
    );

    if (username) {

        console.log(
            `ACCOUNT : ${username}`
        );
    }

    console.log(
        `IG ID   : ${instagramUserId}`
    );

    console.log(
        `VIDEO   : ${videoFile}`
    );

    let cloudinaryVideo = null;

    let published = false;

    try {

        cloudinaryVideo =
            await uploadTemporaryVideo(
                videoFile
            );

        const containerId =
            await createReelContainer({
                instagramUserId,
                accessToken,

                videoUrl:
                    cloudinaryVideo.url,

                caption
            });

        await waitForContainer({
            containerId,
            accessToken
        });

        const publishResult =
            await publishContainer({
                instagramUserId,
                accessToken,
                containerId
            });

        published = true;

        console.log(
            "========================================="
        );

        console.log(
            " INSTAGRAM REELS UPLOAD COMPLETE"
        );

        console.log(
            "========================================="
        );

        return {
            success: true,

            platform:
                "instagram",

            username,

            instagramUserId,

            containerId,

            mediaId:
                publishResult.id
        };

    }
    catch (error) {

        console.error("");
        console.error(
            "========================================="
        );

        console.error(
            " INSTAGRAM REELS UPLOAD FAILED"
        );

        console.error(
            "========================================="
        );

        if (error?.graph) {

            console.error(
                JSON.stringify(
                    error.graph,
                    null,
                    2
                )
            );
        }

        throw error;

    }
    finally {

        /*
        컨테이너가 생성된 뒤 Meta가 영상을
        다운로드하는 시간이 있으므로,

        게시 성공한 경우에만 Cloudinary 임시 영상을
        정리한다.

        실패한 경우에는 원인 분석을 위해 남긴다.
        */

        if (
            published &&
            cloudinaryVideo?.publicId
        ) {

            await removeTemporaryVideo(
                cloudinaryVideo.publicId
            );
        }
    }
}
