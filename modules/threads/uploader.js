import axios from "axios";

/*
=========================================================
ShortsAI - Threads Text Uploader
SHOPPING ONLY

Threads 공식 게시 흐름

1. POST /{threads-user-id}/threads
   -> TEXT 컨테이너 생성

2. POST /{threads-user-id}/threads_publish
   -> 실제 게시
=========================================================
*/

const GRAPH_URL =
    "https://graph.threads.net/v1.0";


export async function uploadThreadsText(
    text,
    {
        threadsUserId,
        accessToken,
        username = ""
    } = {}
) {

    text =
        String(text || "").trim();

    if (!text) {
        throw new Error(
            "Threads 게시 본문 없음"
        );
    }

    if (!threadsUserId) {
        throw new Error(
            "threadsUserId 없음"
        );
    }

    if (!accessToken) {
        throw new Error(
            "Threads accessToken 없음"
        );
    }

    /*
    =====================================================
    Threads 텍스트 제한

    공식 문서 기준 500자.
    Director가 제한을 지키는 것이 원칙이며,
    여기서는 잘라서 잘못 게시하지 않고 실패시킨다.
    =====================================================
    */

    if (
        Buffer.byteLength(text, "utf8") > 500
    ) {
        throw new Error(
            `Threads 본문 500바이트 초과 : ${Buffer.byteLength(text, "utf8")}`
        );
    }


    console.log("");
    console.log(
        "========================================="
    );
    console.log(
        " THREADS TEXT UPLOAD"
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
        `THREADS ID : ${threadsUserId}`
    );


    try {

        /*
        =================================================
        1단계
        TEXT 컨테이너 생성
        =================================================
        */

        const createResponse =
            await axios.post(
                `${GRAPH_URL}/${threadsUserId}/threads`,
                null,
                {
                    params: {
                        media_type: "TEXT",
                        text,
                        access_token:
                            accessToken
                    }
                }
            );


        const creationId =
            createResponse.data?.id;


        if (!creationId) {
            throw new Error(
                "Threads 컨테이너 ID 생성 실패"
            );
        }


        console.log(
            `[THREADS] CONTAINER : ${creationId}`
        );


        /*
        =================================================
        컨테이너 처리 완료 확인
        =================================================
        */

        let containerStatus = "";

        for (let attempt = 1; attempt <= 30; attempt++) {

            const statusResponse =
                await axios.get(
                    `${GRAPH_URL}/${creationId}`,
                    {
                        params: {
                            fields: "id,status,error_message",
                            access_token:
                                accessToken
                        }
                    }
                );

            containerStatus =
                statusResponse.data?.status || "";

            console.log(
                `[THREADS] CONTAINER STATUS : ${containerStatus}`
            );

            if (containerStatus === "FINISHED") {
                break;
            }

            if (
                containerStatus === "ERROR" ||
                containerStatus === "EXPIRED"
            ) {
                throw new Error(
                    `Threads 컨테이너 처리 실패 : ${containerStatus}`
                );
            }

            await new Promise(
                resolve => setTimeout(resolve, 2000)
            );
        }

        if (containerStatus !== "FINISHED") {
            throw new Error(
                `Threads 컨테이너 처리 시간 초과 : ${containerStatus || "UNKNOWN"}`
            );
        }

        /*
        Threads 공식 문서 권장:
        컨테이너 처리 후 publish 전 약 30초 대기
        */

        console.log(
            "[THREADS] FINISHED - 게시 전 30초 대기"
        );

        await new Promise(
            resolve => setTimeout(resolve, 30000)
        );


        /*
        =================================================
        2단계
        실제 게시
        =================================================
        */

        const publishResponse =
            await axios.post(
                `${GRAPH_URL}/${threadsUserId}/threads_publish`,
                null,
                {
                    params: {
                        creation_id:
                            creationId,

                        access_token:
                            accessToken
                    }
                }
            );


        const mediaId =
            publishResponse.data?.id;


        if (!mediaId) {
            throw new Error(
                "Threads 게시 ID 없음"
            );
        }


        console.log(
            "========================================="
        );
        console.log(
            " THREADS TEXT UPLOAD COMPLETE"
        );
        console.log(
            "========================================="
        );

        console.log(
            `[THREADS] 게시 성공 : ${mediaId}`
        );


        return {
            success: true,
            platform: "threads",
            username,
            threadsUserId,
            creationId,
            mediaId
        };

    }
    catch (error) {

        console.error("");
        console.error(
            "========================================="
        );
        console.error(
            " THREADS TEXT UPLOAD FAILED"
        );
        console.error(
            "========================================="
        );

        if (error?.response?.data) {

            console.error(
                JSON.stringify(
                    error.response.data,
                    null,
                    2
                )
            );

        }
        else {

            console.error(
                error.message
            );

        }

        throw error;
    }
}


export default {
    uploadThreadsText
};
