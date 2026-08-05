import {
    recordUpload
} from "./topicService.js";

import {
    remember as rememberDuplicate
} from "./duplicateService.js";


/*
    =========================================================
    UPLOAD RECORD SERVICE

    업로드 성공 이후의 모든 저장 작업을 총괄한다.

    upload.js는
    개별 Service / DB 구조를 알 필요가 없다.

    새로운 저장 Service가 생기면
    이 파일에 작은 저장 함수를 추가한다.
    =========================================================
*/


export async function recordUploadData(
    data = {}
) {

    const results = {};


    /*
        각 저장 작업은 독립적으로 실행한다.

        하나의 DB 저장 실패가
        다른 DB 저장을 막지 않는다.
    */

    results.topic =
        await saveTopic(
            data
        );


    results.duplicate =
        await saveDuplicate(
            data
        );


    /*
        앞으로 추가

        results.views =
            await saveViews(data);

        results.analytics =
            await saveAnalytics(data);
    */


    return results;

}


/*
    =========================================================
    TOPIC
    =========================================================
*/

async function saveTopic(
    data
) {

    try {

        const id =
            await recordUpload({

                topic:
                    data.topic,

                channel:
                    data.channel,

                category:
                    data.category,

                videoId:
                    data.videoId,

                url:
                    data.url,

                keywords:
                    data.keywords,

                uploadedAt:
                    data.uploadedAt

            });


        console.log(
            "[UploadRecord] TOPIC 저장 완료"
        );


        return {
            success: true,
            id
        };

    }
    catch (error) {

        console.error(
            "[UploadRecord] TOPIC 저장 실패:",
            error.message
        );


        return {
            success: false,
            error:
                error.message
        };

    }

}


/*
    =========================================================
    DUPLICATE
    =========================================================
*/

async function saveDuplicate(
    data
) {

    const results = {
        uploadedTitle: false,
        sourceTopic: false
    };


    /*
        실제 YouTube 업로드 제목 저장
    */

    try {

        results.uploadedTitle =
            await rememberDuplicate({

                topic:
                    data.topic,

                channel:
                    data.channel,

                uploadedAt:
                    data.uploadedAt

            });


        console.log(
            "[UploadRecord] DUPLICATE 제목 저장 완료"
        );

    }
    catch (error) {

        console.error(
            "[UploadRecord] DUPLICATE 제목 저장 실패:",
            error.message
        );

    }


    /*
        제작을 시작하게 만든 원래 후보 주제 저장

        실제 제목과 다른 경우에만 저장한다.
    */

    try {

        const sourceTopic =
            String(
                data.sourceTopic || ""
            ).trim();

        const uploadedTitle =
            String(
                data.topic || ""
            ).trim();


        if (
            sourceTopic &&
            sourceTopic !== uploadedTitle
        ) {

            results.sourceTopic =
                await rememberDuplicate({

                    topic:
                        sourceTopic,

                    channel:
                        data.channel,

                    uploadedAt:
                        data.uploadedAt

                });


            console.log(
                "[UploadRecord] DUPLICATE 원본주제 저장 완료"
            );

        }

    }
    catch (error) {

        console.error(
            "[UploadRecord] DUPLICATE 원본주제 저장 실패:",
            error.message
        );

    }


    return {
        success: true,
        ...results
    };

}


export default {

    recordUploadData

};
