import ai from "./ai/index.js";
import animal from "./animal/index.js";
import history from "./history/index.js";
import shopping from "./shopping/index.js";
import science from "./science/index.js";
import {
    callGeminiSearch
} from "../ai/gemini.js";

import {
    parseJSON
} from "../ai/utils.js";

import trendService from
    "../services/trendService.js";


const channels = {
    ai,
    animal,
    history,
    shopping,
    science
};

const VALID_CHANNELS = new Set([
    "ai",
    "animal",
    "history",
    "shopping",
    "science"
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

    const input =
        Array.isArray(trends)
            ? trends.map(
                (item, index) => ({
                    id: index,
                    title: String(
                        item?.title || ""
                    ).trim(),
                    trendQuery:
                        String(
                            item?.trendQuery || ""
                        ).trim(),
                    views:
                        Number(
                            item?.views || 0
                        ),
                    likes:
                        Number(
                            item?.likes || 0
                        ),
                    comments:
                        Number(
                            item?.comments || 0
                        ),
                    publishedAt:
                        String(
                            item?.publishedAt || ""
                        ),
                    score:
                        Number(
                            item?.score || 0
                        )
                })
            ).filter(
                item => item.title
            )
            : [];

    console.log(
        `[Channels] YouTube 후보 ${input.length}개 → Gemini 웹검색+선정`
    );

    const prompt = `
너는 ShortsAI의 실시간 Shorts 주제 선정 AI다.

이번 작업에서는 반드시 현재 Google 웹검색을 사용한다.

그리고 아래에 제공되는 YouTube 최근 인기 후보도 반드시 함께 검토한다.

중요:
- YouTube 후보만 보고 선정하지 않는다.
- 웹검색 결과만 보고 선정하지 않는다.
- YouTube 후보와 현재 웹검색 정보를 함께 판단한다.
- 별도의 두 번째 AI 호출을 하지 않는다.
- 최종적으로 Shorts 제작에 가장 적합한 주제만 선정한다.

목표:
현재 사람들이 관심을 가질 가능성이 높고
Shorts 하나로 만들었을 때 흥미로운 "구체적인 주제"를 선정한다.

정치, 정당, 선거, 국회, 정치인 등 정치 중심 주제는 제외한다.

단순 사건사고나 일반 뉴스도 제외한다.

단순 연예인 근황이나 스포츠 경기 결과처럼
정보성 Shorts 주제로 발전시키기 어려운 내용은 제외한다.

다음 채널 중 하나만 선택한다.

history
- 역사
- 역사적 사건
- 전쟁
- 왕조
- 역사 인물
- 고대 문명
- 과거의 흥미로운 사건
- 역사적 미스터리

animal
- 동물
- 반려동물
- 야생동물
- 곤충
- 희귀동물
- 동물 행동
- 생물

ai
- AI
- 인공지능
- ChatGPT
- Gemini
- 생성형 AI
- AI 도구
- AI 기술
- 로봇
- AI 산업

shopping
- 제품
- 상품
- 신제품
- 생활용품
- 소비자 제품
- 구매 관련 정보
- 제품 비교
- 제품의 특징이나 사용법

science
- 생활 속 과학
- 일상생활의 과학 원리
- 생활용품의 과학
- 주방과 음식의 과학
- 가전제품의 원리
- 청소와 세탁의 과학
- 물, 얼음, 증기
- 빛, 소리, 온도, 습도
- 전기와 정전기
- 수면, 피로, 운동 등의 인체과학
- 사람들이 직접 경험하지만 원리를 모르는 현상

science는 전문 과학 자체보다
일반인이 실제 생활에서 "왜?"라고 궁금해할 만한 주제를 우선한다.

좋은 주제 예:
"전자레인지는 왜 음식 속까지 데울 수 있을까?"
"얼음은 왜 물에 뜰까?"
"선풍기를 틀면 왜 실제 온도가 내려가지 않아도 시원할까?"

나쁜 주제:
"열역학 제2법칙의 수학적 유도"
"양자장론의 세부 이론"

주제는 원본 영상 제목을 그대로 복사하지 않는다.

YouTube 제목이 재미있는 현상을 보여주면
그 현상을 설명하거나 탐구할 수 있는
독립적인 Shorts 주제로 발전시킬 수 있다.

예:
YouTube:
"대야 뒤에 숨은 판다! 나 안 보이지?"

가능한 주제:
"판다는 왜 몸 전체를 숨기지 않아도 안 보인다고 생각할까?"

단, 원본 제목의 내용이 사실인지 불명확하거나
단순 유머라면 억지로 주제로 만들지 않는다.

선정 기준:

1. 현재 관심도
2. YouTube 관심 신호
3. 웹검색에서 확인되는 현재 관심
4. 사람들이 실제로 궁금해할 가능성
5. Shorts 적합성
6. 흥미도
7. 시각화 가능성
8. 정보의 명확성
9. 채널 적합성
10. 반복 제작 가능성

특히 중요:
"조회수가 높은 영상" 자체를 선정하는 것이 목적이 아니다.

조회수가 높은 영상에서
Shorts로 발전시킬 가치가 있는 소재를 찾아야 한다.

또한 YouTube 후보에 없는 주제라도
현재 Google 웹검색에서 훨씬 강한 소재가 발견되면 선정할 수 있다.

반대로 웹검색에서 발견된 소재라도
현재 관심도가 낮거나 Shorts 제작 가치가 낮으면 제외한다.

최종 결과는 최대 30개다.

가능하면 채널별로 편중되지 않도록 하되,
실제로 좋은 주제가 있는 채널을 억지로 채우지 않는다.

각 주제는 서로 실질적으로 달라야 한다.
같은 소재의 제목만 바꾼 중복 주제는 제거한다.

반드시 JSON만 출력한다.

형식:

{
    "items": [
        {
            "id": 0,
            "title": "구체적인 Shorts 주제",
            "channel": "science",
            "score": 96,
            "source": "youtube+google_search"
        }
    ]
}

source는 다음 중 하나를 사용한다.

"youtube"
"YouTube 후보를 주된 근거로 선정한 경우"

"google_search"
"웹검색을 주된 근거로 선정한 경우"

"youtube+google_search"
"YouTube 후보와 웹검색을 함께 근거로 선정한 경우"

대부분의 최종 후보는
youtube+google_search를 우선적으로 사용한다.

score는 0~100이다.

현재 YouTube 후보:
${JSON.stringify(input, null, 2)}

위 후보를 반드시 참고하면서
현재 Google 웹검색을 수행하고,
웹검색 결과와 YouTube 후보를 함께 비교하여
최종 Shorts 주제를 선정하라.
`;

    let response;

    try {

        response =
            await callGeminiSearch(
                prompt
            );

    }
    catch (error) {

        console.error(
            "[Channels] Gemini Trend 검색 실패:",
            error.message
        );

        return [];

    }

    let parsedText =
        String(
            response || ""
        )
            .replace(
                /```json/gi,
                ""
            )
            .replace(
                /```/g,
                ""
            )
            .trim();

    const startIndex =
        parsedText.indexOf("{");

    const endIndex =
        parsedText.lastIndexOf("}");

    if (
        startIndex !== -1 &&
        endIndex !== -1 &&
        endIndex > startIndex
    ) {

        parsedText =
            parsedText.substring(
                startIndex,
                endIndex + 1
            );

    }

    let parsed;

    try {

        parsed =
            JSON.parse(
                parsedText
            );

    }
    catch (error) {

        console.error(
            "[Channels] Trend AI JSON 파싱 실패:",
            error.message
        );

        return [];

    }

    const classified =
        Array.isArray(
            parsed?.items
        )
            ? parsed.items
            : [];

    const result = [];

    const usedTitles =
        new Set();

    const validChannels =
        new Set([
            "history",
            "animal",
            "ai",
            "shopping",
            "science"
        ]);

    for (
        const item
        of classified
    ) {

        const title =
            String(
                item?.title || ""
            ).trim();

        if (!title) {

            continue;

        }

        const channel =
            String(
                item?.channel || ""
            )
                .trim()
                .toLowerCase();

        if (
            !validChannels.has(
                channel
            )
        ) {

            continue;

        }

        const normalizedTitle =
            title
                .toLowerCase()
                .replace(
                    /\s+/g,
                    " "
                );

        if (
            usedTitles.has(
                normalizedTitle
            )
        ) {

            continue;

        }

        usedTitles.add(
            normalizedTitle
        );

        const score =
            Math.max(
                0,
                Math.min(
                    100,
                    Number(
                        item?.score || 0
                    )
                )
            );

        const source =
            String(
                item?.source ||
                "youtube+google_search"
            )
                .trim();

        result.push({
            title,
            channel,
            source,
            score
        });

    }

    console.log(
        `[Channels] AI 최종 Trend 선정 : ${result.length}개`
    );

    for (
        const item
        of result
    ) {

        console.log(
            `[Channels] 선정: [${item.channel}] ${item.title} | ${item.score} | ${item.source}`
        );

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
    "[Channels] YouTube Trend 수집"
);

let youtubeTrends = [];

let classified = [];

try {

    youtubeTrends =
        await trendService.collectTrends(
            "AI|과학|역사|동물|제품|생활"
        );

    console.log(
        `[Channels] YouTube Trend 수집 완료 : ${youtubeTrends.length}`
    );

}
catch (error) {

    console.error(
        "[Channels] YouTube Trend 수집 실패:",
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

try {

    classified =
        await classifyTrends(
            youtubeTrends
        );

}
catch (error) {

    console.error(
        "[Channels] Trend 분류 실패:",
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
    `[Channels] Web Trend 조사 완료 : ${classified.length}`
);

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
