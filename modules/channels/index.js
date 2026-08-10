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
        trends.length > 0
            ? trends.map(
                (item, index) => ({
                    id: index,
                    title: item.title
                })
            )
            : [];

    const prompt = `
너는 ShortsAI의 실시간 Trend Researcher다.

반드시 Google 웹 검색을 사용해서
현재 사람들이 실제로 관심을 가지고 있는
Shorts 콘텐츠 주제를 조사한다.

목표는 뉴스 기사를 수집하는 것이 아니다.

정치 뉴스,
정당,
선거,
국회,
정치인,
사건사고,
일반 뉴스,
사회면 뉴스,
단순 연예 뉴스는 제외한다.

다음과 같은 "사람들이 지금 찾아보고
보고 싶어 하는 주제"를 우선한다.

- 현재 인기 검색 주제
- 최근 관심이 증가한 검색 주제
- YouTube에서 관심을 받을 가능성이 높은 주제
- 최근 온라인에서 많이 언급되는 관심사
- 사람들이 궁금해하는 새로운 정보
- Shorts로 만들기 좋은 흥미로운 소재
- 시각적으로 표현하기 쉬운 소재

중요:

검색 결과를 그대로 뉴스 제목으로 가져오지 않는다.

검색 결과를 바탕으로
Shorts 하나를 만들 수 있는
구체적인 "주제"로 판단한다.

예:

나쁜 결과:
"오늘 정치권에서 발표한 내용"

좋은 결과:
"사람들이 최근 궁금해하는 블랙홀의 비밀"

나쁜 결과:
"어제 발생한 사건"

좋은 결과:
"사람들이 최근 많이 검색하는 이상한 동물 행동"

각 주제는 실제로 존재하는 정보여야 한다.

현재 시점의 관심도를 중요하게 판단한다.

그리고 다음 채널 중 가장 적합한 하나를 선택한다.

history
- 역사
- 역사적 사건
- 전쟁
- 왕조
- 역사 인물
- 고대 문명
- 과거의 흥미로운 사건

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
- 구매
- 리뷰
- 가격
- 할인
- 생활용품
- 소비자 제품

science
- 생활 속 과학
- 일상생활의 과학 원리
- 생활용품의 과학
- 주방과 음식의 과학
- 냉장고, 전자레인지, 세탁기 등 가전제품의 원리
- 청소, 세탁, 보관과 관련된 과학
- 더위와 추위에 관한 생활 과학
- 물, 얼음, 증기와 관련된 일상 현상
- 빛, 소리, 온도, 습도와 관련된 생활 현상
- 정전기와 전기와 관련된 일상 현상
- 수면, 피로, 운동 등 일상에서 궁금한 인체과학
- 음식 조리와 보관에서 일어나는 과학 현상
- 사람들이 일상에서 직접 경험하지만 원리를 모르는 현상
- 소비자가 제품을 사용할 때 궁금해할 수 있는 과학적 원리
- 생활 문제를 과학적으로 설명할 수 있는 주제
- 쉽게 이해할 수 있는 일상 속 물리와 화학
- 쉽게 이해할 수 있는 생활 속 생물학

어느 채널에도 적합하지 않으면
ignore 한다.

각 후보는 Shorts 제작 가능성이 높아야 한다.

특히 다음을 중요하게 판단한다.

1. 현재 관심도
2. 일상생활과의 관련성
3. 사람들이 실제로 궁금해할 가능성
4. Shorts 소재 적합성
5. 흥미도
6. 시각화 가능성
7. 정보의 명확성
8. 채널 적합성
9. 뉴스성 여부

science 채널은 전문 과학지식 자체보다
사람들이 일상에서 직접 경험하거나
생활하면서 한 번쯤 궁금해할 만한 과학 주제를 최우선으로 선택한다.

science 주제 우선순위:

1순위
생활 속에서 직접 경험하는 과학 현상

2순위
가전제품, 생활용품, 음식, 청소, 세탁, 수면, 운동,
더위와 추위, 물, 얼음, 증기, 빛, 소리, 온도,
습도, 전기, 정전기 등과 관련된 과학

3순위
사람들이 자주 접하지만 원리를 잘 모르는 일상 현상

4순위
소비자가 제품이나 생활환경을 사용하면서
"왜 이런 현상이 생기지?"라고 궁금해할 수 있는 과학

5순위
쉽게 이해할 수 있고 시각적으로 보여주기 좋은
물리, 화학, 생물학적 현상

전문 과학 주제는 다음 조건을 만족할 때만 선택한다.

- 일반인이 실제로 궁금해할 가능성이 높고
- 일상적인 질문으로 쉽게 연결할 수 있으며
- Shorts에서 직관적으로 설명할 수 있고
- 시각적으로 표현하기 쉬운 경우

다음과 같은 전문 과학 주제는
현재 관심도가 매우 높더라도 우선순위를 낮춘다.

- 지나치게 전문적인 물리학 이론
- 수학적 설명이 중심인 과학
- 대학 수준의 전문 개념
- 연구자 중심의 세부 과학 지식
- 일반인이 검색할 생활상의 이유가 부족한 주제
- 단순한 과학 용어 설명
- 전문 논문이나 연구 결과 자체를 설명하는 주제

예를 들어

"양자역학의 파동함수"보다
"전자레인지는 왜 음식을 데울 수 있을까?"를 우선한다.

"블랙홀의 사건의 지평선"보다
"블랙홀은 왜 빛조차 빠져나올 수 없을까?"처럼
일반인이 이해하기 쉬운 질문 형태의 주제를 우선한다.

"열역학 제2법칙"보다
"얼음은 왜 물에 뜰까?"처럼
일상에서 직접 볼 수 있는 현상을 우선한다.

"분자 운동론"보다
"뜨거운 음식은 왜 냉장고에 넣기 전에 식혀야 할까?"처럼
생활 속 행동과 연결되는 주제를 우선한다.

중요:
science는 "어려운 과학"을 의미하지 않는다.

science 후보를 선택할 때
"이 정보가 과학적으로 얼마나 전문적인가"보다
"사람들이 실제 생활에서 이것을 보고
왜 그런지 궁금해할 가능성이 있는가"를 더 중요하게 판단한다.

또한 검색량이 높더라도
단순히 전문성이 높다는 이유만으로 science 후보를 선택하지 않는다.

생활과 연결할 수 없는 전문 과학 주제는
다른 조건이 충분히 강하지 않다면 제외한다.

뉴스 자체가 중심이면 제외한다.

검색 결과를 근거로
충분히 좋은 후보를 최대 30개 선정한다.

반드시 JSON만 출력한다.

형식:

{
    "items": [
        {
            "id": 0,
            "title": "구체적인 Shorts 주제",
            "channel": "science",
            "score": 92,
            "source": "web"
        }
    ]
}

score는 0~100이다.

현재 입력 후보가 있으면
검색 결과와 비교하여 더 좋은 후보를 선택한다.

현재 입력 후보가 없으면
웹 검색으로 직접 후보를 생성한다.

현재 입력 후보:
${JSON.stringify(input)}
`;

    const response =
        await callGeminiSearch(
            prompt
        );

    let parsedText =
        String(response)
            .replace(
                /```json/gi,
                ""
            )
            .replace(
                /```/g,
                ""
            )
            .trim();

    const start =
        parsedText.indexOf("{");

    const end =
        parsedText.lastIndexOf("}");

    if (
        start !== -1 &&
        end !== -1
    ) {
        parsedText =
            parsedText.substring(
                start,
                end + 1
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
            "[Channels] Web Trend JSON 파싱 실패:",
            error.message
        );

        return [];
    }

    const classified =
        Array.isArray(
            parsed
                ?.items
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
            title.toLowerCase();

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

        result.push({
            title,
            channel,
            source: "google_search",
            score: Math.max(
                0,
                Math.min(
                    100,
                    Number(
                        item?.score || 0
                    )
                )
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
    "[Channels] Gemini Google Search Trend 조사"
);

let classified = [];

try {

    classified =
        await classifyTrends([]);

}
catch (error) {

    console.error(
        "[Channels] Web Trend 조사 실패:",
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
