import "dotenv/config";
import { google } from "googleapis";

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

const REFRESH_HOURS = 12;

const YOUTUBE_MAX_RESULTS_PER_QUERY = 15;

const TREND_LIMIT = 100;

const TREND_LOOKBACK_HOURS = 72;


/*
    =========================================================
    TREND SERVICE

    책임

    1. YouTube 최근 영상 수집
    2. 검색어별 후보 수집
    3. 영상 통계 조회
    4. 게시 후 경과시간 계산
    5. 조회수 / 좋아요 / 댓글 / 최신성 기반 점수 계산
    6. Trend 후보 반환
    7. Trend DB 저장
    8. 저장 Trend 조회

    중요:

    YouTube 제목을 보고 TrendService가
    주제를 임의로 판단하지 않는다.

    광고인지
    밈인지
    생활영상인지
    AI 영상인지
    역사 영상인지

    이런 의미 판단은 여기서 하지 않는다.

    TrendService는 "후보 수집 + 기본 점수 계산"만 담당한다.

    최종적으로 어떤 주제가 실제 제작 가치가 있는지는
    상위 AI 단계에서 판단한다.
    =========================================================
*/


/*
    =========================================================
    Trend 경과시간
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
    Trend DB 재사용 가능 여부
    =========================================================
*/

export function isTrendFresh() {

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
    제목 정리

    의미 판단을 하지 않는다.

    API에서 받은 제목의 불필요한
    포맷 문자만 최소한 정리한다.
    =========================================================
*/

function cleanTitle(
    title = ""
) {

    return String(title)

        .replace(/\s+/g, " ")

        .trim();

}


/*
    =========================================================
    YouTube 영상 수집

    최근 72시간

    검색어별 후보 수집

    예:

    AI
    과학
    역사
    동물
    제품
    생활

    제목을 보고 영상을 제거하지 않는다.
    =========================================================
*/

async function collectYoutubeVideos(
    query = ""
) {

    const apiKey =
        process.env.YOUTUBE_API_KEY;


    if (!apiKey) {

        console.error(
            "[TrendService] YOUTUBE_API_KEY 없음"
        );

        return [];

    }


    const youtube =
        google.youtube({

            version: "v3",

            auth: apiKey

        });


    const queries =
        String(query || "")

            .split("|")

            .map(
                item =>
                    item.trim()
            )

            .filter(Boolean);


    const searchQueries =
        queries.length > 0
            ? queries
            : [
                "AI",
                "과학",
                "역사",
                "동물",
                "제품",
                "생활"
            ];


    const publishedAfter =
        new Date(

            Date.now() -

            TREND_LOOKBACK_HOURS *
            60 *
            60 *
            1000

        ).toISOString();


    /*
        videoId -> {
            item,
            trendQuery
        }

        같은 영상이 여러 검색어에서 발견되면
        최초 검색어를 유지한다.
    */

    const videoMap =
        new Map();


    /*
        =====================================================
        검색어별 후보 수집
        =====================================================
    */

    for (
        const searchQuery
        of searchQueries
    ) {

        try {

            const response =
                await youtube.search.list({

                    part: [
                        "snippet"
                    ],

                    type: [
                        "video"
                    ],

                    maxResults:
                        YOUTUBE_MAX_RESULTS_PER_QUERY,

                    order:
                        "date",

                    publishedAfter,

                    regionCode:
                        "KR",

                    relevanceLanguage:
                        "ko",

                    q:
                        searchQuery

                });


            const items =
                response.data.items ||
                [];


            for (
                const item
                of items
            ) {

                const videoId =
                    item?.id?.videoId;


                if (!videoId) {

                    continue;

                }


                if (
                    videoMap.has(
                        videoId
                    )
                ) {

                    continue;

                }


                videoMap.set(
                    videoId,
                    {
                        item,
                        trendQuery:
                            searchQuery
                    }
                );

            }

        }
        catch (error) {

            console.error(
                `[TrendService] YouTube 검색 실패 (${searchQuery}):`,
                error.message
            );

        }

    }


    const ids =
        Array.from(
            videoMap.keys()
        );


    if (!ids.length) {

        return [];

    }


    /*
        =====================================================
        영상 통계 조회

        YouTube videos.list는 최대 50개까지
        한 번에 조회한다.
        =====================================================
    */

    const videos = [];


    for (
        let i = 0;
        i < ids.length;
        i += 50
    ) {

        const batch =
            ids.slice(
                i,
                i + 50
            );


        try {

            const response =
                await youtube.videos.list({

                    part: [
                        "snippet",
                        "statistics"
                    ],

                    id:
                        batch

                });


            videos.push(
                ...(
                    response.data.items ||
                    []
                )
            );

        }
        catch (error) {

            console.error(
                "[TrendService] YouTube 통계 조회 실패:",
                error.message
            );

        }

    }


    /*
        =====================================================
        기본 데이터 정리

        제목을 보고 영상을 제거하지 않는다.
        =====================================================
    */

    return videos

        .map(
            video => {

                const snippet =
                    video.snippet ||
                    {};


                const statistics =
                    video.statistics ||
                    {};


                const videoId =
                    video.id ||
                    "";


                const mapped =
                    videoMap.get(
                        videoId
                    );


                const title =
                    cleanTitle(
                        snippet.title || ""
                    );


                const publishedAt =
                    snippet.publishedAt ||
                    "";


                const publishedTime =
                    new Date(
                        publishedAt
                    ).getTime();


                if (
                    !title ||
                    !Number.isFinite(
                        publishedTime
                    )
                ) {

                    return null;

                }


                const ageHours =
                    Math.max(

                        1 / 6,

                        (
                            Date.now() -
                            publishedTime
                        ) /
                        3600000

                    );


                const views =
                    Number(
                        statistics.viewCount ||
                        0
                    );


                const likes =
                    Number(
                        statistics.likeCount ||
                        0
                    );


                const comments =
                    Number(
                        statistics.commentCount ||
                        0
                    );


                return {

                    videoId,

                    title,

                    publishedAt,

                    ageHours,

                    views,

                    likes,

                    comments,

                    trendQuery:
                        mapped?.trendQuery ||
                        ""

                };

            }
        )

        .filter(Boolean);

}


/*
    =========================================================
    Trend Score

    기본적인 "인기 + 반응 + 최신성"만 계산한다.

    1. 조회수 증가 속도       60점
    2. 좋아요 반응            20점
    3. 댓글 반응              10점
    4. 최신성                 10점

    여기서는 콘텐츠의 의미를 판단하지 않는다.

    제목에 "왜"
    제목에 "AI"
    제목에 "동물"
    제목에 "구매"
    제목에 "viral"

    등이 있다고 해서 점수를 임의로 올리거나 내리지 않는다.
    =========================================================
*/

function calculateTrendScores(
    videos = []
) {

    if (
        !Array.isArray(videos) ||
        videos.length === 0
    ) {

        return [];

    }


    const safeVideos =
        videos.map(
            video => {

                const ageHours =
                    Math.max(

                        Number(
                            video.ageHours
                        ) || 0,

                        1 / 6

                    );


                const views =
                    Math.max(

                        Number(
                            video.views
                        ) || 0,

                        0

                    );


                const likes =
                    Math.max(

                        Number(
                            video.likes
                        ) || 0,

                        0

                    );


                const comments =
                    Math.max(

                        Number(
                            video.comments
                        ) || 0,

                        0

                    );


                const viewVelocity =
                    views /
                    ageHours;


                const likeRate =
                    views > 0
                        ? likes / views
                        : 0;


                const commentRate =
                    views > 0
                        ? comments / views
                        : 0;


                return {

                    ...video,

                    ageHours,

                    views,

                    likes,

                    comments,

                    viewVelocity,

                    likeRate,

                    commentRate

                };

            }
        );


    /*
        =====================================================
        상대값 계산

        특정 영상 하나가 압도적인 조회수를 가지고 있어도
        나머지가 전부 0점에 가까워지는 것을 막기 위해
        log1p를 사용한다.
        =====================================================
    */

    const maxViewVelocity =
        Math.max(

            ...safeVideos.map(
                video =>
                    video.viewVelocity
            ),

            1

        );


    const maxLikeRate =
        Math.max(

            ...safeVideos.map(
                video =>
                    video.likeRate
            ),

            0.000001

        );


    const maxCommentRate =
        Math.max(

            ...safeVideos.map(
                video =>
                    video.commentRate
            ),

            0.000001

        );


    return safeVideos.map(
        video => {

            const velocityRatio =
                Math.log1p(
                    video.viewVelocity
                ) /
                Math.log1p(
                    maxViewVelocity
                );


            const likeRatio =
                Math.log1p(
                    video.likeRate *
                    100000
                ) /
                Math.log1p(
                    maxLikeRate *
                    100000
                );


            const commentRatio =
                Math.log1p(
                    video.commentRate *
                    100000
                ) /
                Math.log1p(
                    maxCommentRate *
                    100000
                );


            /*
                72시간 범위 안에서
                시간이 오래될수록 최신성 감소
            */

            const freshnessScore =
                Math.max(

                    0,

                    10 -
                    (
                        video.ageHours /
                        TREND_LOOKBACK_HOURS
                    ) *
                    10

                );


            const velocityScore =
                Math.min(

                    60,

                    Math.max(

                        0,

                        velocityRatio *
                        60

                    )

                );


            const likeScore =
                Math.min(

                    20,

                    Math.max(

                        0,

                        likeRatio *
                        20

                    )

                );


            const commentScore =
                Math.min(

                    10,

                    Math.max(

                        0,

                        commentRatio *
                        10

                    )

                );


            const score =
                Math.min(

                    100,

                    Math.max(

                        0,

                        velocityScore +
                        likeScore +
                        commentScore +
                        freshnessScore

                    )

                );


            return {

                title:
                    video.title,

                score:
                    Number(
                        score.toFixed(
                            2
                        )
                    ),

                source:
                    "youtube",

                trendQuery:
                    video.trendQuery,

                publishedAt:
                    video.publishedAt,

                views:
                    video.views,

                likes:
                    video.likes,

                comments:
                    video.comments

            };

        }
    );

}


/*
    =========================================================
    외부 Trend 수집

    Channel은 YouTube API를 직접 호출하지 않는다.

    호출부 호환:

    collectTrends(
        "AI|과학|역사|동물|제품|생활"
    )

    또는

    collectTrends()
    =========================================================
*/

export async function collectTrends(
    query = ""
) {

    try {

        const videos =
            await collectYoutubeVideos(
                query
            );


        if (
            !videos.length
        ) {

            return [];

        }


        const scored =
            calculateTrendScores(
                videos
            );


        scored.sort(
            (
                a,
                b
            ) =>
                b.score -
                a.score
        );


        return scored.slice(
            0,
            TREND_LIMIT
        );

    }
    catch (error) {

        console.error(
            "[TrendService] YouTube 수집 실패:",
            error.message
        );


        return [];

    }

}


/*
    =========================================================
    Trend 저장

    기존 DB 저장 로직 유지
    =========================================================
*/

export function saveClassifiedTrends(
    trends = []
) {

    if (
        !Array.isArray(
            trends
        ) ||
        trends.length === 0
    ) {

        return 0;

    }


    const saved =
        saveTrends(
            trends
        );


    if (
        saved > 0
    ) {

        setLastRefresh();

    }


    return saved;

}


/*
    =========================================================
    특정 채널 Trend
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
    =========================================================
    저장 Trend 조회
    =========================================================
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
    =========================================================
    전체 저장 Trend
    =========================================================
*/

export function getAllStoredTrends(
    limit = 500
) {

    return getAllTrends(
        limit
    );

}


/*
    =========================================================
    Trend 개수
    =========================================================
*/

export function getTrendCount(
    channel = ""
) {

    return countTrends(
        channel
    );

}


/*
    =========================================================
    상태 확인
    =========================================================
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
            Number.isFinite(
                ageMs
            )
                ? ageMs
                : null,

        ageHours:
            Number.isFinite(
                ageMs
            )
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


/*
    =========================================================
    Default export
    =========================================================
*/

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
