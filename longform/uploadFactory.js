import { google } from "googleapis";

import fs from "node:fs";
import path from "node:path";

import { DATA_ROOT } from "./config/paths.js";

import {
    getProduction,
    updateUploadResult,
    completeProduction
} from "./productionState.js";

import {
    uploadVideo
} from "../modules/upload.js";


const CHANNELS_FILE =
    path.resolve(
        "./modules/channels/channels.json"
    );


function readJSON(file) {

    return JSON.parse(
        fs.readFileSync(
            file,
            "utf8"
        ).replace(/^\\uFEFF/, "")
    );

}


function findChannel(
    config,
    name
) {

    if (
        Array.isArray(config)
    ) {
        return (
            config.find(
                item =>
                    item?.name === name
            ) || null
        );
    }


    if (
        config &&
        typeof config === "object"
    ) {

        if (
            config[name] &&
            typeof config[name] === "object"
        ) {
            return config[name];
        }


        return (
            Object.values(config)
                .find(
                    item =>
                        item?.name === name
                ) || null
        );

    }


    return null;
}


function validateChannel(
    channel,
    name
) {

    if (!channel) {
        throw new Error(
            `YouTube channel not found: ${name}`
        );
    }


    if (
        !channel.clientId ||
        !channel.clientSecret ||
        !channel.refreshToken
    ) {
        throw new Error(
            `YouTube OAuth incomplete: ${name}`
        );
    }

}


function buildMetadata(
    script,
    language
) {

    const metadata =
        script.metadata || {};


    if (language === "ko") {

        return {

            title:
                script.titleKo ||
                metadata.titleKo ||
                script.topic ||
                "역사 다큐멘터리",

            description:
                script.descriptionKo ||
                metadata.descriptionKo ||
                "역사 속 사건과 인물을 깊이 살펴보는 롱폼 다큐멘터리입니다.",

            tags:
                Array.isArray(
                    script.tagsKo
                )
                    ? script.tagsKo
                    : (
                        Array.isArray(
                            metadata.tagsKo
                        )
                            ? metadata.tagsKo
                            : [
                                "역사",
                                "다큐멘터리",
                                "롱폼"
                            ]
                    )

        };

    }


    return {

        title:
            script.titleEn ||
            metadata.titleEn ||
            script.chapters?.[0]?.titleEn ||
            "History Documentary",

        description:
            script.descriptionEn ||
            metadata.descriptionEn ||
            "A long-form history documentary exploring the people, events, and context behind the story.",

        tags:
            Array.isArray(
                script.tagsEn
            )
                ? script.tagsEn
                : (
                    Array.isArray(
                        metadata.tagsEn
                    )
                        ? metadata.tagsEn
                        : [
                            "history",
                            "documentary",
                            "longform"
                        ]
                )

    };

}


/*
=====================================================
LONGFORM YOUTUBE PROCESSING VERIFY

업로드 전송 완료와 YouTube 처리 완료를 구분한다.
processed / succeeded 확인 후에만 production DB에 기록한다.
=====================================================
*/

const YOUTUBE_PROCESSING_POLL_MS = 15000;
const YOUTUBE_PROCESSING_TIMEOUT_MS = 90 * 60 * 1000;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createYoutubeOwnerClient(channel) {

    if (
        !channel?.clientId ||
        !channel?.clientSecret ||
        !channel?.refreshToken
    ) {
        throw new Error("YouTube OAuth credentials missing");
    }

    const oauth = new google.auth.OAuth2(
        channel.clientId,
        channel.clientSecret
    );

    oauth.setCredentials({
        refresh_token: channel.refreshToken
    });

    return google.youtube({
        version: "v3",
        auth: oauth
    });
}

async function waitForYoutubeProcessing(
    channel,
    videoId,
    label
) {

    const youtube =
        createYoutubeOwnerClient(channel);

    const started = Date.now();
    let lastState = "";

    while (
        Date.now() - started <
        YOUTUBE_PROCESSING_TIMEOUT_MS
    ) {

        const response =
            await youtube.videos.list({
                part: [
                    "status",
                    "processingDetails"
                ],
                id: [videoId]
            });

        const video =
            response.data.items?.[0];

        if (!video) {

            if (lastState !== "NOT_FOUND") {
                console.log(
                    `[YOUTUBE PROCESSING] ${label} NOT_FOUND - waiting`
                );
                lastState = "NOT_FOUND";
            }

            await sleep(
                YOUTUBE_PROCESSING_POLL_MS
            );
            continue;
        }

        const uploadStatus =
            video.status?.uploadStatus || "";

        const processingStatus =
            video.processingDetails?.processingStatus || "";

        const stateKey =
            `${uploadStatus}/${processingStatus}`;

        if (stateKey !== lastState) {
            console.log(
                `[YOUTUBE PROCESSING] ${label} upload=${uploadStatus || "-"} process=${processingStatus || "-"}`
            );
            lastState = stateKey;
        }

        if (uploadStatus === "rejected") {
            throw new Error(
                `${label} YouTube rejected: ${video.status?.rejectionReason || "unknown"}`
            );
        }

        if (
            uploadStatus === "failed" ||
            uploadStatus === "deleted"
        ) {
            throw new Error(
                `${label} YouTube upload failed: ${video.status?.failureReason || uploadStatus}`
            );
        }

        if (
            uploadStatus === "processed" ||
            processingStatus === "succeeded"
        ) {
            console.log(
                `[YOUTUBE PROCESSING] ${label} VERIFIED`
            );
            return true;
        }

        if (
            processingStatus === "failed" ||
            processingStatus === "terminated"
        ) {
            throw new Error(
                `${label} YouTube processing failed: ${video.processingDetails?.processingFailureReason || processingStatus}`
            );
        }

        await sleep(
            YOUTUBE_PROCESSING_POLL_MS
        );
    }

    throw new Error(
        `${label} YouTube processing timeout`
    );
}

/*
=====================================================
LONGFORM UPLOAD FACTORY

KO -> History
EN -> EchoesAgo

부분 성공 시 즉시 DB 저장.
재실행 시 이미 업로드된 언어는 SKIP.
=====================================================
*/

export async function uploadLongform({
    productionId,
    topic = "",
    koVideo,
    enVideo,
    workRoot = ""
}) {

    if (!productionId) {
        throw new Error(
            "productionId required"
        );
    }


    if (
        !koVideo ||
        !fs.existsSync(koVideo)
    ) {
        throw new Error(
            "KO final video missing"
        );
    }


    if (
        !enVideo ||
        !fs.existsSync(enVideo)
    ) {
        throw new Error(
            "EN final video missing"
        );
    }


    const root =
        workRoot
            ? path.resolve(workRoot)
            : DATA_ROOT;

    const scriptFile =
        path.join(
            root,
            "longform-script.json"
        );


    if (
        !fs.existsSync(
            scriptFile
        )
    ) {
        throw new Error(
            "longform-script.json missing"
        );
    }


    const script =
        readJSON(
            scriptFile
        );


    const channels =
        readJSON(
            CHANNELS_FILE
        );


    const koChannel =
        findChannel(
            channels,
            "History"
        );


    const enChannel =
        findChannel(
            channels,
            "EchoesAgo"
        );


    validateChannel(
        koChannel,
        "History"
    );

    validateChannel(
        enChannel,
        "EchoesAgo"
    );


    let state =
        getProduction(
            productionId
        );


    if (!state) {
        throw new Error(
            `Production not found: ${productionId}`
        );
    }


    let koResult = null;
    let enResult = null;



    const koThumbnail =
        workRoot
            ? path.join(
                workRoot,
                "thumbnails",
                "thumbnail-ko.jpg"
            )
            : "";

    const enThumbnail =
        workRoot
            ? path.join(
                workRoot,
                "thumbnails",
                "thumbnail-en.jpg"
            )
            : "";


    /*
    =================================================
    KOREAN
    =================================================
    */

    if (
        state.ko_video_id
    ) {

        console.log(
            `[LONGFORM UPLOAD] KO SKIP : ${state.ko_video_id}`
        );

        koResult = {
            success: true,
            id: state.ko_video_id,
            url: state.ko_url
        };

    }
    else {

        console.log(
            "[LONGFORM UPLOAD] KO -> History"
        );


        koResult =
            await uploadVideo(
                koVideo,
                buildMetadata(
                    script,
                    "ko"
                ),
                koChannel,
                topic ||
                script.topic ||
                "",
                koThumbnail
            );


        if (
            !koResult?.success ||
            !koResult?.id
        ) {
            throw new Error(
                "KO YouTube upload failed"
            );
        }


        /*
        Upload itself has already succeeded once uploadVideo returns.
        Persist the video ID BEFORE processing verification so a later
        verification/auth failure can never cause a duplicate re-upload.
        */
        updateUploadResult(
            productionId,
            "ko",
            {
                videoId:
                    koResult.id,

                url:
                    koResult.url || ""
            }
        );

        await waitForYoutubeProcessing(
            koChannel,
            koResult.id,
            "KO"
        );

    }


    /*
    =================================================
    ENGLISH
    =================================================
    */

    state =
        getProduction(
            productionId
        );


    if (
        state.en_video_id
    ) {

        console.log(
            `[LONGFORM UPLOAD] EN SKIP : ${state.en_video_id}`
        );

        enResult = {
            success: true,
            id: state.en_video_id,
            url: state.en_url
        };

    }
    else {

        console.log(
            "[LONGFORM UPLOAD] EN -> EchoesAgo"
        );


        enResult =
            await uploadVideo(
                enVideo,
                buildMetadata(
                    script,
                    "en"
                ),
                enChannel,
                topic ||
                script.topic ||
                "",
                enThumbnail
            );


        if (
            !enResult?.success ||
            !enResult?.id
        ) {
            throw new Error(
                "EN YouTube upload failed"
            );
        }


        /*
        Persist immediately after successful upload for resume safety.
        Processing verification may fail independently of the upload.
        */
        updateUploadResult(
            productionId,
            "en",
            {
                videoId:
                    enResult.id,

                url:
                    enResult.url || ""
            }
        );

        await waitForYoutubeProcessing(
            enChannel,
            enResult.id,
            "EN"
        );

    }


    /*
    =================================================
    BOTH SUCCESS
    =================================================
    */

    state =
        getProduction(
            productionId
        );


    if (
        !state?.ko_video_id ||
        !state?.en_video_id
    ) {
        throw new Error(
            "Both upload IDs were not recorded"
        );
    }


    completeProduction(
        productionId,
        {
            koVideoId:
                state.ko_video_id,

            enVideoId:
                state.en_video_id,

            koUrl:
                state.ko_url,

            enUrl:
                state.en_url
        }
    );


    console.log("");
    console.log(
        "LONGFORM BOTH UPLOAD COMPLETE"
    );

    console.log(
        `KO_VIDEO_ID=${state.ko_video_id}`
    );

    console.log(
        `EN_VIDEO_ID=${state.en_video_id}`
    );


    return {

        success: true,

        productionId,

        ko: {
            id:
                state.ko_video_id,

            url:
                state.ko_url
        },

        en: {
            id:
                state.en_video_id,

            url:
                state.en_url
        }

    };

}


export default {
    uploadLongform
};
