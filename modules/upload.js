import fs from "fs";
import { google } from "googleapis";

import {
    success,
    debug
} from "./logger.js";

import {
    recordUploadData
} from "./services/uploadRecordService.js";


export async function uploadVideo(
    videoFile,
    metadata,
    channel = null,
    sourceTopic = "",
    thumbnailFile = null
) {

    success(
        "UPLOAD START"
    );


    if (!fs.existsSync(videoFile)) {

        throw new Error(
            "업로드 영상 없음"
        );

    }


    const CLIENT_ID =
        channel?.clientId ||
        process.env.YOUTUBE_CLIENT_ID;


    const CLIENT_SECRET =
        channel?.clientSecret ||
        process.env.YOUTUBE_CLIENT_SECRET;


    const REFRESH_TOKEN =
        channel?.refreshToken ||
        process.env.YOUTUBE_REFRESH_TOKEN;


    const oauth2Client =
        new google.auth.OAuth2(
            CLIENT_ID,
            CLIENT_SECRET
        );


    oauth2Client.setCredentials({

        refresh_token:
            REFRESH_TOKEN

    });


    const youtube =
        google.youtube({

            version: "v3",

            auth:
                oauth2Client

        });


    const title =
        metadata?.title ||
        "놀라운 사실 이야기";


    const description =
        metadata?.description ||
        "재미있는 정보 쇼츠입니다.";


    const tags =
        metadata?.tags ||
        [
            "shorts",
            "정보",
            "상식"
        ];


    debug(
        "영상 업로드 중..."
    );


    let response;

    try {

        response =
            await youtube.videos.insert({

            part: [
                "snippet",
                "status"
            ],


            requestBody: {

                snippet: {

                    title,

                    description,

                    tags,

                    categoryId:
                        "22"

                },


                status: {

                    privacyStatus:
                        "public"

                }

            },


            media: {

                body:
                    fs.createReadStream(
                        videoFile
                    )

            }

        });


    }
    catch (error) {

        const message =
            String(
                error?.response?.data?.error?.message ||
                error?.cause?.message ||
                error?.message ||
                ""
            );

        const reasons =
            (
                error?.response?.data?.error?.errors ||
                []
            )
            .map(
                item =>
                    String(
                        item?.reason || ""
                    )
            );


        /*
            YouTube 채널 업로드 한도 초과.

            같은 채널에서 계속 영상을 제작해도
            업로드할 수 없으므로 Manager에
            채널 차단 신호를 전달한다.
        */
        if (
            message.includes(
                "The user has exceeded the number of videos they may upload"
            ) ||
            reasons.includes(
                "uploadLimitExceeded"
            )
        ) {

            error.shortsAIError =
                "YOUTUBE_UPLOAD_LIMIT";

            error.channelBlocked =
                true;

            error.blockReason =
                "UPLOAD_LIMIT";

            console.error(
                `[UPLOAD BLOCK] ${channel?.name || "UNKNOWN"} : YouTube 업로드 한도 초과`
            );

        }


        throw error;

    }


    success(
        "UPLOAD COMPLETE"
    );


    const videoId =
        response.data.id;

    /*
        =====================================================
        YOUTUBE CUSTOM THUMBNAIL
        =====================================================

        영상 업로드 성공 후 videoId를 받은 다음
        생성된 thumbnail.jpg를 실제 YouTube 영상에 적용한다.

        썸네일 적용 실패는 영상 업로드 실패로 처리하지 않는다.
        영상 자체는 이미 YouTube에 업로드됐기 때문이다.
    */

    let thumbnailApplied =
        false;

    if (
        thumbnailFile &&
        fs.existsSync(
            thumbnailFile
        )
    ) {

        try {

            await youtube.thumbnails.set({

                videoId,

                media: {

                    mimeType:
                        "image/jpeg",

                    body:
                        fs.createReadStream(
                            thumbnailFile
                        )

                }

            });

            thumbnailApplied =
                true;

            success(
                "YOUTUBE THUMBNAIL COMPLETE"
            );

        }
        catch (thumbnailError) {

            const thumbnailMessage =
                String(
                    thumbnailError
                        ?.response
                        ?.data
                        ?.error
                        ?.message ||
                    thumbnailError
                        ?.message ||
                    ""
                );

            console.error(
                "[YOUTUBE THUMBNAIL] 적용 실패:",
                thumbnailMessage
            );

        }

    }
    else {

        console.error(
            "[YOUTUBE THUMBNAIL] 파일 없음:",
            thumbnailFile || "NULL"
        );

    }



    const url =
        `https://youtube.com/watch?v=${videoId}`;


    const uploadedAt =
        new Date().toISOString();


    /*
        =====================================================
        업로드 후 저장

        upload.js는 저장 구조를 알지 않는다.

        저장 총괄 Service에
        업로드 결과만 전달한다.
        =====================================================
    */

    try {

        await recordUploadData({

            topic:
                title,

            sourceTopic,

            channel:
                channel?.name ||
                channel?.channel ||
                "",

            category:
                channel?.category ||
                "",

            videoId,

            url,

            keywords:
                tags,

            uploadedAt

        });

    }
    catch (error) {

        /*
            영상은 이미 YouTube에 업로드되었다.

            저장 계층의 오류 때문에
            업로드 자체를 실패 처리하지 않는다.
        */

        console.error(
            "[UploadRecord] 저장 처리 실패:",
            error.message
        );

    }


    return {

        success: true,

        id:
            videoId,

        url,

        title,

        tags,

        uploadDate:
            uploadedAt

    };

}
