import {
    addTopic,
    getTopics,
    getTopicsByChannel,
    countTopics
} from "../database/topicDB.js";


/*
    =========================================================
    Topic Service

    역할
    ---------------------------------------------------------
    실제 업로드가 완료된 주제를 Topic DB에 기록한다.

    Topic DB는
    "어떤 주제가 실제로 제작/업로드 되었는가"
    만 관리한다.

    중복 판정은 DuplicateService의 책임이다.
    조회수는 ViewService의 책임이다.
    트렌드는 TrendService의 책임이다.
    =========================================================
*/


export function recordUpload({
    topic,
    channel = "",
    category = "",
    videoId = "",
    url = "",
    keywords = [],
    uploadedAt = new Date().toISOString()
} = {}) {

    if (!topic) {

        throw new Error(
            "[TopicService] topic 없음"
        );

    }

    return addTopic({

        topic,

        channel,

        category,

        videoId,

        url,

        keywords,

        uploadedAt

    });

}


/*
    전체 업로드 주제 조회
*/

export function getUploadedTopics() {

    return getTopics();

}


/*
    채널별 업로드 주제 조회
*/

export function getChannelTopics(
    channel
) {

    return getTopicsByChannel(
        channel
    );

}


/*
    업로드 주제 개수
*/

export function getUploadedTopicCount() {

    return countTopics();

}


export default {

    recordUpload,

    getUploadedTopics,

    getChannelTopics,

    getUploadedTopicCount

};
