import {
    getGoogleTrends
} from "./providers/google.js";

import {
    getYoutubeTrends
} from "./providers/youtube.js";

import {
    getNewsTrends
} from "./providers/news.js";

import {
    getRedditTrends
} from "./providers/reddit.js";

import {
    cleanTopics
} from "./cleaner/index.js";

import {
    normalizeTopics
} from "./normalizer.js";


/*
    =========================================================
    Trend Collector

    역할:
    외부 Provider에서 실제 트렌드 원본을 수집한다.

    여기서는 하지 않는다:
    - 채널 분류
    - 의미 판단
    - AI 호출
    - 주제 생성
    - 중복 DB 검사
    - 최종 점수 선정
    =========================================================
*/


export async function collectTrends() {

    const topics = [];


    /*
        Provider 하나가 실패해도
        전체 Trend 수집을 중단하지 않는다.
    */

    const providers = [

        [
            "google",
            getGoogleTrends
        ],

        [
            "youtube",
            getYoutubeTrends
        ],

        [
            "news",
            getNewsTrends
        ],

        [
            "reddit",
            getRedditTrends
        ]

    ];


    for (
        const [name, provider]
        of providers
    ) {

        try {

            /*
                category는 아직 결정하지 않는다.

                기존 Provider 호환성을 위해
                빈 문자열만 전달한다.
            */

            const result =
                await provider("");


            if (
                Array.isArray(result)
            ) {

                topics.push(
                    ...result
                );

            }

        }
        catch (error) {

            console.error(
                `[TrendCollector] ${name} 실패:`,
                error.message
            );

        }

    }


    /*
        언론사 꼬리표 / 불필요 문자열 정리
    */

    const cleaned =
        cleanTopics(
            topics
        );


    /*
        동일 제목 통합
    */

    return normalizeTopics(
        cleaned
    );

}


/*
    기존 호출과의 임시 호환.

    현재는 channel을 사용하지 않는다.
*/

export async function getTrendingTopics() {

    return collectTrends();

}


export default {

    collectTrends,
    getTrendingTopics

};
