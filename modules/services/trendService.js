import {
    collectTrends as collectExternalTrends
} from "../trends/index.js";

import {
    saveTrends,
    getTrendsByChannel,
    getAllTrends,
    countTrends,
    clearOldTrends,
    setLastRefresh,
    getLastRefresh
} from "../database/trendDB.js";


const DEFAULT_LIMIT = 200;

/*
    Trend 재수집 주기

    12시간 이내에는
    외부 API / AI를 다시 사용하지 않는다.
*/

const REFRESH_HOURS = 12;


/*
    =========================================================
    TREND SERVICE

    역할

    1. Trend DB 상태 확인
    2. 12시간 재사용 여부 판단
    3. 외부 Trend 원본 수집
    4. AI 분류 완료 결과 저장
    5. 채널별 Trend 조회

    AI 호출 자체는 여기서 하지 않는다.
    =========================================================
*/


/*
    =========================================================
    마지막 정상 갱신 이후 경과시간
    =========================================================
*/

export function getTrendAgeMs() {

    const lastRefresh =
        getLastRefresh();


    if (!lastRefresh) {

        return Infinity;

    }


    const time =
        new Date(
            lastRefresh
        ).getTime();


    if (!Number.isFinite(time)) {

        return Infinity;

    }


    return (
        Date.now() -
        time
    );

}


/*
    =========================================================
    현재 Trend DB 재사용 가능 여부

    조건

    1. DB에 Trend가 있어야 한다.
    2. 마지막 정상 갱신이 존재해야 한다.
    3. 마지막 정상 갱신 후 12시간 미만이어야 한다.
    =========================================================
*/

export function isTrendFresh() {

    /*
        먼저 7일 초과 자료 정리
    */

    clearOldTrends();


    const count =
        countTrends();


    if (count <= 0) {

        return false;

    }


    const age =
        getTrendAgeMs();


    const maxAge =
        REFRESH_HOURS *
        60 *
        60 *
        1000;


    return (
        age >= 0 &&
        age < maxAge
    );

}


/*
    =========================================================
    외부 Trend 원본 수집

    여기서는 저장하지 않는다.

    AI 분류 성공 전까지
    기존 Trend DB를 건드리지 않는다.
    =========================================================
*/

export async function collectTrends() {

    try {

        const result =
            await collectExternalTrends();


        if (!Array.isArray(result)) {

            return [];

        }


        return result.filter(
            item =>
                item &&
                item.title
        );

    }
    catch (error) {

        console.error(
            "[TrendService] 외부 수집 실패:",
            error.message
        );


        return [];

    }

}


/*
    =========================================================
    AI 분류 완료 결과 저장

    중요:

    빈 배열은 저장 성공으로 처리하지 않는다.

    실제 분류 결과가 존재할 때만 저장하고
    마지막 정상 갱신시간을 변경한다.

    기존 Trend DB는 삭제하지 않는다.
    =========================================================
*/

export function saveClassifiedTrends(
    trends = []
) {

    if (
        !Array.isArray(trends) ||
        trends.length === 0
    ) {

        return 0;

    }


    const saved =
        saveTrends(
            trends
        );


    if (saved > 0) {

        setLastRefresh();

    }


    return saved;

}


/*
    =========================================================
    특정 채널 Trend

    각 채널이 자기 데이터를 직접 가져간다.
    =========================================================
*/

export function getTrendingTopics(
    channel,
    limit = DEFAULT_LIMIT
) {

    return getTrendsByChannel(
        channel,
        limit
    );

}


/*
    저장 Trend 조회
*/

export function getStoredTrends(
    channel,
    limit = DEFAULT_LIMIT
) {

    return getTrendsByChannel(
        channel,
        limit
    );

}


/*
    전체 저장 Trend
*/

export function getAllStoredTrends(
    limit = 500
) {

    return getAllTrends(
        limit
    );

}


/*
    Trend 개수
*/

export function getTrendCount(
    channel = ""
) {

    return countTrends(
        channel
    );

}


/*
    상태 확인용
*/

export function getTrendStatus() {

    const lastRefresh =
        getLastRefresh();


    const count =
        countTrends();


    const ageMs =
        getTrendAgeMs();


    const fresh =
        isTrendFresh();


    return {

        count,

        lastRefresh,

        ageMs:
            Number.isFinite(ageMs)
                ? ageMs
                : null,

        ageHours:
            Number.isFinite(ageMs)
                ? (
                    ageMs /
                    3600000
                )
                : null,

        refreshHours:
            REFRESH_HOURS,

        fresh

    };

}


export default {

    collectTrends,

    saveClassifiedTrends,

    getTrendingTopics,

    getStoredTrends,

    getAllStoredTrends,

    getTrendCount,

    getTrendAgeMs,

    isTrendFresh,

    getTrendStatus

};
