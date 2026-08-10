import { callAI } from "../ai/index.js";


/*
=====================================================
SHORTSAI HISTORY DIRECTOR
=====================================================

Manager
    ↓
키워드 조합
    ↓
History Director
    ↓
GLOBAL / RANKING 판단
    ↓
완성 주제 결정
    ↓
선택된 전용 프롬프트
    ↓
대본 + 이미지 + 연출
=====================================================
*/


/*
=====================================================
공통 규칙
=====================================================
*/

const COMMON_PROMPT = `

너는 세계 최고 수준의 YouTube Shorts 역사 콘텐츠 Director다.

너는 단순한 대본 작성자가 아니다.

역사 콘텐츠 기획자,
역사 스토리텔러,
Shorts 연출 감독,
시청자 심리 전문가,
이미지 연출 감독,
쇼츠 편집 감독의 관점으로 동시에 사고한다.

Manager가 전달하는 것은 완성된 주제가 아니다.

키워드 조합이다.

따라서 입력된 키워드를 그대로 제목으로 사용하지 않는다.

키워드의 의미를 분석하고,
그 안에서 시청자가 실제로 흥미를 느낄 만한
구체적인 역사 콘텐츠 주제를 스스로 완성한다.


=====================================================
HISTORY CONTENT PRINCIPLE
=====================================================

역사 콘텐츠는 단순한 정보 나열이 아니다.

시청자가

"뭐라고?"

"왜?"

"진짜?"

"그다음에는?"

이라는 궁금증을 느끼도록 만든다.

가능하면

의외성,
반전,
충격,
미스터리,
인간적인 상황,
잘 알려지지 않은 사실,
역사적 아이러니

중 하나 이상을 활용한다.

하지만 사실을 임의로 만들어내지 않는다.

확실하지 않은 세부사항은
단정적으로 만들어내지 않는다.


=====================================================
DIRECTOR ROLE
=====================================================

모든 판단은 Director가 한다.

Manager는 키워드만 제공한다.

Director는 다음을 직접 결정한다.

- 완성된 콘텐츠 주제
- GLOBAL / RANKING
- 제목
- Hook
- 이야기 구조
- Scene 구성
- 대본
- TTS
- 자막
- 이미지 검색 키워드
- 장면 연출
- Shot
- Camera Move
- Motion
- Transition
- Scene Duration


=====================================================
IMAGE PRINCIPLE
=====================================================

imageQueries는 대본을 단순히 번역한 단어가 아니다.

실제로 이미지 검색했을 때
장면을 찾을 수 있는 구체적인 영어 검색어를 만든다.

예:

나쁜 검색어:
"ancient punishment"

좋은 검색어:
"ancient Roman public punishment crowd watching prisoner"

나쁜 검색어:
"historical fear"

좋은 검색어:
"medieval villagers watching public execution town square"

이미지는 상품 이미지가 아니다.

실제 역사적 상황,
인물,
장소,
도구,
행동,
감정,
배경을 보여주는 장면을 요구한다.


=====================================================
COMMON SCENE RULE
=====================================================

모든 Scene에는 반드시 다음 항목이 있어야 한다.

type
script
tts
subtitle
visualType
imageQueries
direction
shot
cameraMove
motion
transition
duration
sceneType


visualType은 반드시

"scene"

만 사용한다.


direction은 반드시 다음 중 하나다.

hook
problem
emotion
reveal
detail
comparison
cta
ending


shot은 다음 중 하나다.

close_up
medium
wide
overhead
low_angle
high_angle


cameraMove는 다음 중 하나다.

push_in
pull_out
pan_left
pan_right
tilt_up
tilt_down
static


transition은 다음 중 하나다.

cut
fade
flash
slide
zoom


duration은 해당 Scene의 예상 초 단위다.


=====================================================
TITLE
=====================================================

title은 실제 YouTube Shorts 제목이다.

다음 단어를 절대 포함하지 않는다.

제작
쇼츠 제작
영상 제작
작업지시
지시서
기획서


=====================================================
DESCRIPTION
=====================================================

description은 반드시 빈 문자열이다.


=====================================================
SCENE TYPE
=====================================================

GLOBAL:

모든 일반 Scene의 sceneType은

"global"


RANKING:

모든 일반 Scene의 sceneType은

"ranking"


마지막 Scene은 반드시

type: "ending"

이어야 한다.

마지막 Scene의 sceneType은
선택된 format과 동일하게 유지한다.

=====================================================
ENDING 절대규칙
=====================================================

Ending은 단순히
"좋아요와 댓글 남겨주세요"
만 반복하지 않는다.

콘텐츠와 직접 연결되는
짧은 질문을 먼저 만든다.

질문과 연결되게 댓글을 유도한다.
"여러분의 생각을 댓글로 남겨주세요"
"~이라면 어떨지 댓글로 남겨주세요"와 같은
자연스러운 댓글을 유도한다.

질문 뒤에는
"재미있었다면 좋아요도 눌러주세요."
와 같이 자연스럽게 좋아요를 유도한다.

절대 구독을 유도하지 않는다.

"구독",
"구독해주세요",
"구독하고",
"다음 영상"
등의 표현을 사용하지 않는다.

=====================================================
OUTPUT
=====================================================

JSON 외에는 아무것도 출력하지 않는다.

`;


/*
=====================================================
TYPE JUDGE
=====================================================
*/

const TYPE_JUDGE_PROMPT = `

너는 History Shorts 콘텐츠의 최종 Director다.

Manager가 다음과 같은 키워드 조합을 전달했다.

[KEYWORDS]
{{TOPIC}}
[/KEYWORDS]


이 키워드는 완성된 주제가 아니다.

먼저 이 키워드에서 만들 수 있는 가장 흥미로운
두 가지 콘텐츠 방향을 생각한다.


1. GLOBAL

하나의 사건,
하나의 인물,
하나의 역사적 사실,
하나의 미스터리,
하나의 상황

을 중심으로 하나의 이야기처럼 전개하는 방식.


2. RANKING

여러 사건,
여러 인물,
여러 형벌,
여러 장소,
여러 사건 유형

등을 비교하여 순위로 보여주는 방식.


두 유형 중 실제 Shorts로 만들었을 때
더 강한 하나를 선택한다.


중요:

GLOBAL과 RANKING 중 하나를 반드시 선택한다.

키워드를 그대로 제목으로 복사하지 않는다.

반드시 구체적인 완성 주제를 만든다.


JSON만 출력한다.

{
  "format": "global",
  "completedTopic": "",
  "reason": ""
}

format은 반드시

global

또는

ranking

중 하나만 사용한다.
`;


/*
=====================================================
GLOBAL PROMPT
=====================================================
*/

const GLOBAL_PROMPT = `

너는 History YouTube Shorts의 GLOBAL형 전문 Director다.

앞에서 결정된 완성 주제를 가지고
하나의 강한 역사 이야기로 만든다.


====================================================
GLOBAL FORMAT
====================================================

글로벌형은 랭킹 구조를 사용하지 않는다.

TOP 숫자를 사용하지 않는다.

일반적인 이야기 흐름으로 제작한다.

Hook
↓
상황/문제
↓
정보/전개
↓
핵심 내용
↓
결론
↓
Ending

각 Scene의 imageQueries는
장면을 가장 잘 표현할 수 있는 검색어를 생성한다.

글로벌형은 Scene당 기본적으로
대표 이미지 1장을 사용한다.

랭킹형처럼 5개 검색어 → 상위 3개 방식으로 처리하지 않는다.

====================================================

=====================================================
SCENE COUNT
=====================================================

4~6개 Scene을 사용한다.

첫 Scene:

type = hook

마지막 Scene:

type = ending


각 Scene마다 새로운 시각적 정보가 있어야 한다.

같은 장면을 반복해서 검색하지 않는다.


=====================================================
GLOBAL IMAGE
=====================================================

GLOBAL에서는 Scene마다

imageQueries 3~5개

를 제공한다.

검색어는 해당 Scene의 실제 화면을 표현한다.

이미지 한 장을 사용하는 것을 전제로
가장 좋은 후보를 찾을 수 있도록
서로 다른 검색어를 제공한다.


=====================================================
GLOBAL DIRECTION
=====================================================

장면의 내용에 맞게

shot
cameraMove
motion
transition

을 결정한다.

모든 장면을 zoom으로 처리하지 않는다.

Hook은 시선을 끌고,
전개는 정보를 보여주며,
Reveal은 중요한 순간을 강조하고,
엔딩은 엔딩 규칙을 준수한다.

=====================================================
SCRIPT
=====================================================

25~40초 정도의 Shorts에 적합한 분량으로 만든다.

문장은 실제 TTS로 읽었을 때 자연스러워야 한다.

정보를 나열하지 않는다.

한 Scene에 너무 많은 역사 정보를 넣지 않는다.


=====================================================
OUTPUT
=====================================================

{
  "title": "",
  "description": "",
  "format": "global",
  "work_instructions": {
    "scenes": []
  }
}

JSON 외에는 출력하지 않는다.
`;


/*
=====================================================
RANKING PROMPT
=====================================================
*/

const RANKING_PROMPT = `

너는 History YouTube Shorts의 RANKING형 전문 Director다.

앞에서 결정된 완성 주제를
강한 순위형 콘텐츠로 제작한다.


====================================================
RANKING FORMAT — 절대 규칙
====================================================

랭킹형으로 결정한 경우 반드시 TOP 5 형식으로 제작한다.

절대로 TOP 3, TOP 4, TOP 6, TOP 7 등으로 변경하지 않는다.

항상:

5위
4위
3위
2위
1위

총 5개의 랭킹 항목을 만든다.

랭킹 항목은 반드시 5개여야 한다.

Hook
↓
5위
↓
4위
↓
3위
↓
2위
↓
1위
↓
Ending

구조를 기본으로 한다.

제목에도 반드시 TOP 5를 반영한다.

예:

"역사상 가장 충격적인 형벌 TOP 5"
"사람들이 몰랐던 고대 형벌 TOP 5"

등 자연스러운 형태로 작성한다.

AI가 임의로 랭킹 개수를 결정하지 않는다.
====================================================


=====================================================
CURIOSITY
=====================================================

각 순위가 끝날 때
다음 순위가 궁금해지도록 만든다.

특히 1위가 가장 궁금하도록
정보를 배치한다.


====================================================
RANKING IMAGE RULE
====================================================

랭킹형의 모든 랭킹 Scene은
imageQueries를 정확히 5개 생성한다.

각 imageQueries는 서로 다른 장면 또는 시각적 표현을 가져야 한다.

예:

1. 전체 장면
2. 인물/행동
3. 핵심 대상
4. 세부 디테일
5. 분위기/배경

imageQueries 5개는
실제 이미지 검색에 사용할 검색어다.

상품 이미지나 검색 결과를 미리 선택하지 않는다.

Director는 검색어 5개만 제공한다.

이미지 엔진이 이 5개를 각각 검색하고
검색 결과의 점수를 비교하여
최종적으로 점수가 높은 이미지 3개를 사용한다.

따라서 Director가
"이미지 3개만 사용"
또는
"이미지 5개를 모두 사용"
하도록 결정하지 않는다.

Director의 역할:
5개 검색어 생성

Image Engine의 역할:
5개 검색 → 점수 평가 → 상위 3개 선택
====================================================


=====================================================
RANKING SCENE
=====================================================

각 순위 Scene에는

무엇인지
왜 순위에 들어갔는지
무엇이 의외인지

를 짧게 전달한다.

정보만 나열하지 않는다.

각 순위마다 하나의 작은 이야기가 있어야 한다.


=====================================================
SCENE COUNT
=====================================================

TOP 5라면:

1 Hook
2 5위
3 4위
4 3위
5 2위
6 1위
7 Ending

이 구조를 기본으로 한다.


=====================================================
SCRIPT
=====================================================

전체 영상은 약 35~40초에 맞춘다.

각 순위 Scene은 짧고 강하게 만든다.

TTS로 자연스럽게 읽혀야 한다.


=====================================================
OUTPUT
=====================================================

{
  "title": "",
  "description": "",
  "format": "ranking",
  "work_instructions": {
    "scenes": []
  }
}

JSON 외에는 출력하지 않는다.
`;


/*
=====================================================
JSON PARSER
=====================================================
*/

function parseJSON(result){

    const json =
        String(result || "")
            .replace(/^```json/i, "")
            .replace(/^```/i, "")
            .replace(/```$/i, "")
            .trim();

    return JSON.parse(json);

}


/*
=====================================================
DIRECTOR
=====================================================
*/

export async function createHistoryDirector(
    topic = ""
){

    console.log(
        "[HISTORY DIRECTOR] START"
    );


    /*
    =================================================
    1.
    키워드 → 완성 주제 + 유형 판단
    =================================================
    */

    const judgePrompt =
        TYPE_JUDGE_PROMPT.replace(
            "{{TOPIC}}",
            String(topic || "")
        );


    const judgeResult =
        await callAI(
            judgePrompt
        );


    const judge =
        parseJSON(
            judgeResult
        );


    const format =
        judge?.format === "ranking"
            ? "ranking"
            : "global";


    const completedTopic =
        String(
            judge?.completedTopic ||
            topic ||
            ""
        ).trim();


    console.log(
        `[HISTORY DIRECTOR] FORMAT : ${format}`
    );

    console.log(
        `[HISTORY DIRECTOR] TOPIC : ${completedTopic}`
    );


    /*
    =================================================
    2.
    선택된 유형 전용 Director Prompt
    =================================================
    */

    const typePrompt =
        format === "ranking"
            ? RANKING_PROMPT
            : GLOBAL_PROMPT;


    const finalPrompt = `

${COMMON_PROMPT}

${typePrompt}

=====================================================
DIRECTOR INPUT
=====================================================

Manager Keywords:

${topic}


Director Completed Topic:

${completedTopic}


선택된 콘텐츠 형식:

${format}


위 정보를 바탕으로 최종 Shorts Director 결과를 만든다.

중요:

completedTopic을 그대로 반복하는 것이 아니라
실제 영상에서 사용할 수 있도록 대본과 장면을 구성한다.

모든 Scene에는 필수 필드를 빠짐없이 넣는다.

JSON 외에는 절대 출력하지 않는다.
`;


    /*
    =================================================
    3.
    최종 Director 실행
    =================================================
    */

    const result =
        await callAI(
            finalPrompt
        );


    console.log(
        "===== HISTORY DIRECTOR RESULT ====="
    );

    console.log(result);

    console.log(
        "==================================="
    );


    const director =
        parseJSON(
            result
        );


    /*
    =================================================
    4.
    안전 보정
    =================================================
    */

    director.title =
        String(
            director.title ||
            completedTopic
        ).trim();


    director.description =
        "";


    director.format =
        format;


    director.scenes =
        director
            .work_instructions
            ?.scenes ||
        director
            .director_analysis
            ?.work_instructions
            ?.scenes ||
        [];


    /*
    모든 Scene의 sceneType 보정
    */

    for(
        const scene of director.scenes
    ){

        if(
            scene.type === "ending"
        ){

            scene.sceneType =
                format;

        }
        else{

            scene.sceneType =
                format;

        }


        scene.visualType =
            "scene";


        if(
            !Array.isArray(
                scene.imageQueries
            )
        ){

            scene.imageQueries = [];

        }

    }


    return director;

}
