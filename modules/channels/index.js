import ai from "./ai/index.js";
import animal from "./animal/index.js";
import history from "./history/index.js";
import shopping from "./shopping/index.js";

import {
    callAI
} from "../ai/index.js";

import {
    parseJSON
} from "../ai/utils.js";

import trendService from
    "../services/trendService.js";


const channels = {

    ai,
    animal,
    history,
    shopping

};


const VALID_CHANNELS =
    new Set([
        "ai",
        "animal",
        "history",
        "shopping"
    ]);


/*
    =========================================================
    Trend 의미 분류

    새 Trend 수집이 필요한 경우에만 실행한다.

    AI 역할:

    Trend → Channel

    제목 생성 X
    주제 생성 X
    제목 수정 X

    의미 분류만 수행한다.
    =========================================================
*/

async function classifyTrends(
    trends = []
) {

    if (!trends.length) {

        return [];

    }


    const input =
        trends.map(
            (item, index) => ({
                id: index,
                title: item.title
            })
        );


    const prompt = `
너는 유튜브 쇼츠 시스템의 트렌드 분류기다.

아래 최신 트렌드 각각의 의미를 이해하고
가장 적합한 채널 하나를 선택한다.

사용 가능한 채널:

history
- 역사
- 전쟁
- 역사적 사건
- 왕조
- 역사 인물
- 과거 사건
- 역사적 배경을 설명할 수 있는 사건

animal
- 동물
- 반려동물
- 야생동물
- 곤충
- 생물

ai
- AI
- 인공지능
- ChatGPT
- Gemini
- 생성형 AI
- 로봇 AI
- AI 기술
- AI 산업

shopping
- 제품
- 상품
- 신제품
- 가격
- 할인
- 구매
- 리뷰
- 쇼핑

어느 채널에도 적합하지 않으면:

ignore

중요:

제목의 특정 단어만 보고 판단하지 않는다.
문장의 실제 의미를 판단한다.

입력된 id는 절대 변경하지 않는다.

제목을 수정하지 않는다.
새 제목을 만들지 않는다.
새 주제를 만들지 않는다.

JSON만 출력한다.

형식:

{
  "items": [
    {
      "id": 0,
      "channel": "history"
    }
  ]
}

트렌드:

${JSON.stringify(input)}
`;


    const response =
        await callAI(
            prompt
        );


    const parsed =
        parseJSON(
            response
        );


    const classified =
        Array.isArray(parsed)
            ? parsed
            : (
                Array.isArray(parsed?.items)
                    ? parsed.items
                    : []
            );


    const result = [];

    const usedIds =
        new Set();


    for (const item of classified) {

        const id =
            Number(
                item?.id
            );


        /*
            잘못된 ID 제거
        */

        if (
            !Number.isInteger(id) ||
            id < 0 ||
            id >= trends.length
        ) {

            continue;

        }


        /*
            AI가 같은 ID를
            두 번 반환하는 경우 방지
        */

        if (
            usedIds.has(id)
        ) {

            continue;

        }


        usedIds.add(id);


        const channel =
            String(
                item?.channel || ""
            )
                .trim()
                .toLowerCase();


        /*
            ignore 또는
            존재하지 않는 채널 제거
        */

        if (
            !VALID_CHANNELS.has(
                channel
            )
        ) {

            continue;

        }


        const original =
            trends[id];


        result.push({

            title:
                original.title,

            channel,

            source:
                original.source || "",

            score:
                Number(
                    original.finalScore ??
                    original.score ??
                    0
                )

        });

    }


    return result;

}


/*
    =========================================================
    Trend 준비

    AUTO 실행 전 딱 한 번 호출한다.

    12시간 이내:
        DB 재사용
        외부 수집 X
        AI 호출 X

    12시간 초과:
        외부 수집
        AI 분류 1회
        정상 결과만 DB 저장

    실패:
        기존 DB 유지
    =========================================================
*/

async function prepareTrends() {

    const status =
        trendService.getTrendStatus();


    console.log(
        `[Channels] Trend DB : ${status.count}`
    );


    if (status.lastRefresh) {

        const age =
            Number(
                status.ageHours || 0
            );


        console.log(
            `[Channels] Trend 경과 : ${age.toFixed(2)}시간`
        );

    }


    /*
        =====================================================
        12시간 이내

        여기서 즉시 종료한다.

        외부 API 호출 없음
        AI 호출 없음
        =====================================================
    */

    if (status.fresh) {

        console.log(
            "[Channels] Trend DB 재사용"
        );

        console.log(
            "[Channels] 외부 수집 생략"
        );

        console.log(
            "[Channels] AI 분류 생략"
        );


        return {
            refreshed: false,
            reused: true,
            count: status.count
        };

    }


    /*
        =====================================================
        12시간 초과 또는 DB 없음
        =====================================================
    */

    console.log(
        "[Channels] Trend 갱신 필요"
    );


    /*
        STEP 1
        외부 Trend 전체 수집
    */

    console.log(
        "[Channels] Trend 외부 수집"
    );


    const rawTrends =
        await trendService.collectTrends();


    console.log(
        `[Channels] Trend 원본 : ${rawTrends.length}`
    );


    /*
        외부 수집 실패

        기존 DB는 건드리지 않는다.
    */

    if (
        rawTrends.length === 0
    ) {

        console.log(
            "[Channels] Trend 수집 결과 없음"
        );

        console.log(
            "[Channels] 기존 Trend DB 유지"
        );


        return {
            refreshed: false,
            reused: true,
            count:
                trendService.getTrendCount()
        };

    }


    /*
        STEP 2
        AI 의미분류

        이 갱신 사이클에서 1회
    */

    console.log(
        "[Channels] AI Trend 분류"
    );


    let classified = [];


    try {

        classified =
            await classifyTrends(
                rawTrends
            );

    }
    catch (error) {

        console.error(
            "[Channels] AI Trend 분류 실패:",
            error.message
        );


        console.log(
            "[Channels] 기존 Trend DB 유지"
        );


        return {
            refreshed: false,
            reused: true,
            count:
                trendService.getTrendCount()
        };

    }


    console.log(
        `[Channels] 분류 완료 : ${classified.length}`
    );


    /*
        AI가 정상적인 분류 결과를
        하나도 만들지 못했다.

        기존 DB를 유지한다.
    */

    if (
        classified.length === 0
    ) {

        console.log(
            "[Channels] 유효 Trend 분류 없음"
        );

        console.log(
            "[Channels] 기존 Trend DB 유지"
        );


        return {
            refreshed: false,
            reused: true,
            count:
                trendService.getTrendCount()
        };

    }


    /*
        STEP 3
        정상 분류 결과 저장

        saveClassifiedTrends()가 성공하면
        last_refresh도 이 시점에서 갱신된다.
    */

    const saved =
        trendService.saveClassifiedTrends(
            classified
        );


    console.log(
        `[Channels] Trend DB 저장 : ${saved}`
    );


    if (
        saved <= 0
    ) {

        console.log(
            "[Channels] Trend 저장 실패"
        );


        return {
            refreshed: false,
            reused: true,
            count:
                trendService.getTrendCount()
        };

    }


    console.log(
        "[Channels] Trend 갱신 완료"
    );


    return {
        refreshed: true,
        reused: false,
        count:
            trendService.getTrendCount()
    };

}


/*
    =========================================================
    AUTO Channel 실행
    =========================================================
*/

export async function execute(
    categoryList = [],
    job = {}
) {

    const results = [];


    /*
        AUTO 전체에서 Trend 준비는
        딱 한 번만 수행한다.
    */

    await prepareTrends();


    /*
        =====================================================
        각 채널 실행

        Trend를 여기서 나눠주지 않는다.

        각 채널은 common.js를 통해
        Trend Service에 자기 category를 요청하고

        Trend DB에서 자기 channel 데이터만
        직접 가져간다.
        =====================================================
    */

    for (
        const category
        of categoryList
    ) {

        const key =
            String(
                category || ""
            )
                .trim()
                .toLowerCase();


        const channel =
            channels[key];


        if (!channel) {

            console.log(
                `[Channels] 알 수 없는 채널 : ${key}`
            );

            continue;

        }


        console.log(
            `[Channels] ${key} 실행`
        );


        const orders =
            await channel.generateTopics(
                job
            );


        if (
            Array.isArray(orders)
        ) {

            results.push(
                ...orders
            );

        }

    }


    return results;

}


export default {

    execute

};
