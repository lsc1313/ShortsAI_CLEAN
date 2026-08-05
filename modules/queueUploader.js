import fs from "fs";

import {
    getQueueJob,
    markQueueRunning,
    markQueueCompleted,
    markQueueFailed,
    retryQueueJob,
    removeQueueJob
} from "./queue.js";

import {
    uploadVideo
} from "./upload.js";


/*
=====================================================
QUEUE UPLOADER

목적

YouTube 업로드 제한 때문에 보관된
완성 영상을 다시 업로드한다.

중요

- 새 영상 제작 안 함
- queue의 완성 영상 사용
- 업로드 성공 시에만 queue 제거 가능
- 업로드 제한이면 파일 유지
=====================================================
*/


export async function uploadQueuedShort(
    jobId,
    {
        removeAfterSuccess = true
    } = {}
) {

    const job =
        getQueueJob(jobId);

    if (!job) {

        throw new Error(
            `QUEUE 작업을 찾을 수 없습니다: ${jobId}`
        );

    }


    /*
    --------------------------------------------------
    보관 파일 확인
    --------------------------------------------------
    */

    if (
        !job.video ||
        !fs.existsSync(job.video)
    ) {

        throw new Error(
            `QUEUE 영상이 없습니다: ${job.video || "UNKNOWN"}`
        );

    }


    if (
        !job.thumbnail ||
        !fs.existsSync(job.thumbnail)
    ) {

        throw new Error(
            `QUEUE 썸네일이 없습니다: ${job.thumbnail || "UNKNOWN"}`
        );

    }


    console.log("");
    console.log(
        "========================================"
    );
    console.log(
        `[QUEUE UPLOAD] 재업로드 시작 : ${job.id}`
    );
    console.log(
        `[QUEUE UPLOAD] 채널 : ${job.channel?.name || "UNKNOWN"}`
    );
    console.log(
        `[QUEUE UPLOAD] 주제 : ${job.topic}`
    );
    console.log(
        "========================================"
    );


    /*
    --------------------------------------------------
    running
    --------------------------------------------------
    */

    markQueueRunning(
        job.id
    );


    try {

        const result =
            await uploadVideo(
                job.video,
                job.metadata,
                job.channel,
                job.topic,
                job.thumbnail
            );


        /*
        --------------------------------------------------
        실제 업로드 성공
        --------------------------------------------------
        */

        markQueueCompleted(
            job.id,
            result
        );


        console.log(
            `[QUEUE UPLOAD] 성공 : ${job.id}`
        );


        /*
        업로드 성공이 확인된 뒤에만
        queue 파일을 삭제한다.
        */

        if (removeAfterSuccess) {

            removeQueueJob(
                job.id,
                {
                    removeFiles: true
                }
            );

            console.log(
                `[QUEUE UPLOAD] 보관 파일 제거 : ${job.id}`
            );

        }


        return {

            success: true,

            uploaded: true,

            limitBlocked: false,

            jobId:
                job.id,

            channel:
                job.channel,

            result

        };

    }
    catch (error) {

        /*
        --------------------------------------------------
        YouTube 업로드 제한이 아직 유지되는 경우
        --------------------------------------------------
        */

        if (
            error?.channelBlocked === true ||
            error?.shortsAIError ===
                "YOUTUBE_UPLOAD_LIMIT"
        ) {

            /*
            재시도 가능하도록 pending으로 돌린다.

            영상/썸네일은 절대 삭제하지 않는다.
            */

            retryQueueJob(
                job.id
            );


            console.log(
                `[QUEUE UPLOAD] 업로드 제한 유지 : ${job.id}`
            );


            return {

                success: false,

                uploaded: false,

                limitBlocked: true,

                jobId:
                    job.id,

                channel:
                    job.channel,

                error:
                    error.message

            };

        }


        /*
        --------------------------------------------------
        업로드 제한 이외의 오류

        파일은 그대로 보관한다.
        상태만 failed로 기록한다.
        --------------------------------------------------
        */

        markQueueFailed(
            job.id,
            error
        );


        console.error(
            `[QUEUE UPLOAD] 실패 : ${job.id}`,
            error.message
        );


        return {

            success: false,

            uploaded: false,

            limitBlocked: false,

            jobId:
                job.id,

            channel:
                job.channel,

            error:
                error.message

        };

    }

}


/*
=====================================================
CHANNEL QUEUE PROCESSOR

특정 채널에 보관된 대기 영상을
오래된 순서대로 재업로드한다.

업로드 제한이 계속되면 즉시 중단한다.
=====================================================
*/

import {
    getQueue
} from "./queue.js";


function getChannelKey(channel) {

    if (!channel) {
        return "DEFAULT";
    }

    return (
        channel.id ||
        channel.channelId ||
        channel.name ||
        channel.refreshToken ||
        "DEFAULT"
    );

}


export async function processChannelQueue(
    channel
) {

    const channelKey =
        getChannelKey(channel);


    const jobs =
        getQueue()
            .filter(job => {

                /*
                pending 작업만 자동 재시도한다.

                failed 작업은 다른 오류일 수 있으므로
                자동으로 반복 업로드하지 않는다.
                */

                if (
                    job.status !== "pending"
                ) {
                    return false;
                }


                return (
                    getChannelKey(
                        job.channel
                    ) === channelKey
                );

            })
            .sort((a, b) =>
                String(a.createdAt)
                    .localeCompare(
                        String(b.createdAt)
                    )
            );


    if (jobs.length === 0) {

        return {

            success: true,

            blocked: false,

            processed: 0,

            uploaded: 0,

            remaining: 0

        };

    }


    console.log("");
    console.log(
        "========================================"
    );

    console.log(
        `[QUEUE] 채널 대기 영상 : ${jobs.length}개`
    );

    console.log(
        `[QUEUE] 채널 : ${channel?.name || "UNKNOWN"}`
    );

    console.log(
        "========================================"
    );


    let processed = 0;
    let uploaded = 0;


    for (const job of jobs) {

        processed++;


        const result =
            await uploadQueuedShort(
                job.id
            );


        /*
        ---------------------------------------------
        업로드 성공

        제한이 풀렸다는 의미이므로
        다음 대기 영상도 계속 처리한다.
        ---------------------------------------------
        */

        if (result.uploaded === true) {

            uploaded++;

            continue;

        }


        /*
        ---------------------------------------------
        업로드 제한 유지

        더 시도하지 않는다.
        ---------------------------------------------
        */

        if (
            result.limitBlocked === true
        ) {

            console.log(
                `[QUEUE] 업로드 제한 유지 - 처리 중단`
            );


            return {

                success: false,

                blocked: true,

                processed,

                uploaded,

                remaining:
                    jobs.length - uploaded

            };

        }


        /*
        ---------------------------------------------
        기타 오류

        같은 채널에서 연속 업로드를 시도하지 않는다.
        파일은 queue에 그대로 남는다.
        ---------------------------------------------
        */

        console.log(
            `[QUEUE] 일반 업로드 오류 - 처리 중단`
        );


        return {

            success: false,

            blocked: false,

            processed,

            uploaded,

            remaining:
                jobs.length - uploaded,

            error:
                result.error

        };

    }


    return {

        success: true,

        blocked: false,

        processed,

        uploaded,

        remaining: 0

    };

}
