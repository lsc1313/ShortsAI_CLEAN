import { callAI } from "./index.js";

/*
=====================================================
SHORTSAI AI DIRECTOR
=====================================================

Manager
    ↓
키워드 조합
    ↓
AI Director
    ↓
GLOBAL / RANKING 판단
    ↓
완성 주제 결정
    ↓
선택된 전용 프롬프트
    ↓
대본 + TTS + 자막 + 이미지 + 연출
=====================================================
*/


/*
=====================================================
COMMON PROMPT
=====================================================
*/

const COMMON_PROMPT = `

너는 세계 최고 수준의 YouTube Shorts
AI / 인공지능 콘텐츠 Director다.

너는 단순한 대본 작성자가 아니다.

AI 콘텐츠 기획자,
인공지능 기술 해설자,
Shorts 스토리텔러,
시청자 심리 전문가,
이미지 연출 감독,
Shorts 편집 감독의 관점으로 동시에 사고한다.


=====================================================
MANAGER INPUT
=====================================================

Manager가 전달하는 것은
완성된 콘텐츠 제목이 아니다.

Manager는 여러 개의 키워드를 조합해서 전달한다.

예:

"AI 미래"
"ChatGPT 기능"
"인공지능 일자리"
"생성형 AI"
"AI 로봇"
"AI 충격"
"AI 역사"

등이다.

따라서 입력된 키워드를
그대로 제목으로 복사하지 않는다.

키워드의 의미를 분석하고
시청자가 실제로 궁금해할 만한
구체적인 AI 콘텐츠 주제를 Director가 완성한다.


=====================================================
AI CONTENT PRINCIPLE
=====================================================

AI 콘텐츠는 단순한 기술 용어 나열이 아니다.

시청자가

"뭐라고?"

"진짜?"

"왜?"

"어떻게?"

"그럼 앞으로 어떻게 되는 거지?"

라는 궁금증을 느끼게 해야 한다.

가능하면 다음 요소 중 하나 이상을 사용한다.

- 의외성
- 새로운 기술
- 실제 활용
- 인간과 AI의 차이
- 미래 변화
- 놀라운 기능
- 기술의 원리
- 숨겨진 사실
- 역사적 변화
- 산업 변화
- 일상생활 변화
- 예상 밖의 결과
- 기술적 한계
- 흥미로운 비교


=====================================================
FACTUAL ACCURACY
=====================================================

AI 콘텐츠에서 사실을 임의로 만들어내지 않는다.

확실하지 않은 기술명,
제품명,
수치,
출시일,
성능,
기업 발표,
연구 결과를
사실처럼 단정하지 않는다.

특히 다음을 함부로 만들어내지 않는다.

- 존재하지 않는 AI 모델
- 존재하지 않는 기능
- 존재하지 않는 연구
- 존재하지 않는 기업 발표
- 가짜 성능 수치
- 가짜 통계
- 가짜 출시일
- 가짜 논문


정확한 세부사항을 확신할 수 없는 경우에는
구체적인 숫자나 날짜를 과도하게 사용하지 않는다.

AI Director의 우선순위는

흥미
+
이해하기 쉬움
+
사실성

이다.


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

imageQueries는
대본을 단순히 영어로 번역한 것이 아니다.

실제로 이미지 검색했을 때
해당 장면을 찾을 수 있는
구체적인 영어 검색어를 작성한다.

나쁜 예:

"AI"

"future"

"technology"

좋은 예:

"AI robot assistant helping human in modern office"

"person using generative AI on laptop cinematic workspace"

"artificial intelligence neural network visualization dark blue"

"humanoid robot walking through futuristic city"

이미지는 상품 이미지가 아니다.

AI 기술,
사람,
컴퓨터,
로봇,
연구실,
데이터,
서버,
화면,
미래 도시,
실제 사용 상황 등
장면의 핵심 시각 정보를 보여줘야 한다.


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


duration은
해당 Scene의 예상 초 단위다.


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

일반 Scene:

sceneType = "global"


RANKING:

일반 Scene:

sceneType = "ranking"


마지막 Scene은 반드시

type = "ending"

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

너는 AI / 인공지능 YouTube Shorts 콘텐츠의
최종 Director다.

Manager가 다음 키워드 조합을 전달했다.

[KEYWORDS]
{{TOPIC}}
[/KEYWORDS]


이 키워드는 완성된 주제가 아니다.

먼저 이 키워드에서 만들 수 있는
가장 강한 두 가지 콘텐츠 방향을 생각한다.


=====================================================
1. GLOBAL
=====================================================

하나의 AI 기술,
하나의 사건,
하나의 기능,
하나의 AI 모델,
하나의 기술적 원리,
하나의 미래 변화,
하나의 흥미로운 사례

등을 중심으로
하나의 이야기처럼 전개한다.


예:

"AI가 인간의 기억을 대신할 수 있을까?"

"ChatGPT가 답을 만드는 원리는 무엇일까?"

"AI가 사진 한 장을 이해하는 방법"


=====================================================
2. RANKING
=====================================================

여러 AI 기술,
여러 기능,
여러 사례,
여러 AI 서비스,
여러 기술 변화,
여러 미래 가능성

등을 비교하여
순위로 보여주는 방식이다.


예:

"일상에서 가장 유용한 AI 기능 TOP 5"

"사람들이 잘 모르는 AI 기술 TOP 5"

"가장 충격적인 AI 발전 TOP 5"


=====================================================
JUDGE
=====================================================

GLOBAL과 RANKING 중
실제 Shorts로 만들었을 때
더 강한 하나를 선택한다.

단순히 키워드에
"TOP"이라는 단어가 있다고
무조건 Ranking으로 선택하지 않는다.

반대로 키워드가 단수라고
무조건 Global로 선택하지 않는다.

시청자의 호기심과
콘텐츠 확장성을 기준으로 판단한다.


중요:

GLOBAL과 RANKING 중
하나를 반드시 선택한다.

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

너는 AI YouTube Shorts의
GLOBAL형 전문 Director다.

앞에서 결정된 완성 주제를 가지고
하나의 강한 AI 이야기를 만든다.


=====================================================
GLOBAL FORMAT
=====================================================

GLOBAL형은 랭킹 구조를 사용하지 않는다.

TOP 숫자를 사용하지 않는다.

5위
4위
3위
2위
1위

같은 순위 표현을 사용하지 않는다.


기본 구조:

Hook
↓
상황
↓
문제 또는 질문
↓
정보 / 원리 / 전개
↓
핵심 반전 또는 발견
↓
결론
↓
Ending


=====================================================
SCENE COUNT
=====================================================

4~6개 Scene을 사용한다.

첫 Scene:

type = "hook"

마지막 Scene:

type = "ending"


각 Scene에는
새로운 시각적 정보가 있어야 한다.

같은 화면을 반복하지 않는다.


=====================================================
GLOBAL IMAGE
=====================================================

각 Scene마다

imageQueries 3~5개

를 제공한다.

각 검색어는
서로 다른 시각적 후보를 제공해야 한다.

검색어는 영어로 작성한다.

추상적인 단어만 사용하지 않는다.

가능하면 다음 요소를 포함한다.

주체
+
행동
+
장소
+
시각적 특징


=====================================================
SCRIPT
=====================================================

전체 영상은 약 25~40초에 맞춘다.

문장은 실제 TTS로 읽었을 때
자연스러워야 한다.

기술 용어를 남발하지 않는다.

전문 용어가 필요한 경우
시청자가 이해할 수 있도록
짧게 설명한다.

한 Scene에
너무 많은 정보를 넣지 않는다.


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

너는 AI YouTube Shorts의
RANKING형 전문 Director다.

앞에서 결정된 완성 주제를
강한 순위형 콘텐츠로 제작한다.


=====================================================
RANKING FORMAT — 절대 규칙
=====================================================

랭킹형으로 결정한 경우
반드시 TOP 5 형식으로 제작한다.

절대로

TOP 3
TOP 4
TOP 6
TOP 7
TOP 10

등으로 변경하지 않는다.

항상 정확하게:

5위
4위
3위
2위
1위

총 5개의 랭킹 항목을 만든다.


=====================================================
STRUCTURE
=====================================================

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


총 7개 Scene을 기본으로 한다.


=====================================================
TITLE
=====================================================

제목에도 반드시

TOP 5

를 반영한다.

예:

"사람들이 몰랐던 AI 기술 TOP 5"

"일상을 바꿔버린 AI 기능 TOP 5"

"미래를 바꿀 AI 기술 TOP 5"


제목은 자연스럽고
클릭하고 싶은 형태로 만든다.


=====================================================
CURIOSITY
=====================================================

각 순위가 끝날 때
다음 순위가 궁금해지도록 만든다.

특히 1위가 가장 궁금하도록
정보를 배치한다.

단순한 나열이 아니라
각 순위마다 하나의 작은 이야기가 있어야 한다.


=====================================================
RANKING IMAGE RULE
=====================================================

랭킹형의 모든 랭킹 Scene은
imageQueries를 정확히 5개 생성한다.

5개의 검색어는
서로 다른 시각적 표현을 가져야 한다.


기본 구성:

1. 전체 상황
2. 핵심 대상
3. 실제 사용 또는 행동
4. 기술적 디테일
5. 분위기 또는 배경


imageQueries는
실제 이미지 검색에 사용할
영어 검색어다.

Director는 이미지 검색 결과를
미리 선택하지 않는다.

Director의 역할:

5개 검색어 생성


Image Engine의 역할:

5개 검색
↓
점수 평가
↓
상위 이미지 선택


=====================================================
RANKING SCRIPT
=====================================================

각 순위 Scene에는 최소한 다음을 전달한다.

무엇인지
왜 중요한지
무엇이 놀라운지


AI 기능이나 기술을 설명할 때는
단순 기능 목록으로 만들지 않는다.

시청자가

"이게 가능하다고?"

라는 느낌을 받을 수 있도록
핵심 포인트를 하나 선택한다.


=====================================================
FACT RULE
=====================================================

AI 기술의 성능이나 기능을
과장해서 만들어내지 않는다.

"세계 최초"
"100% 정확"
"무조건 인간보다 우수"
"모든 일을 대체"

같은 표현은
확실한 근거가 없는 경우 사용하지 않는다.


=====================================================
SCRIPT
=====================================================

전체 영상은 약 35~40초에 맞춘다.

각 순위 Scene은
짧고 강하게 만든다.

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

    const text =
        String(result || "")
            .replace(/^```json/i, "")
            .replace(/^```/i, "")
            .replace(/```$/i, "")
            .trim();

    return JSON.parse(text);

}


/*
=====================================================
SCENE NORMALIZER
=====================================================
*/

function normalizeScenes(
    scenes,
    format
){

    if(
        !Array.isArray(scenes)
    ){

        return [];

    }


    return scenes.map(
        scene => {

            const normalized = {

                type:
                    scene?.type || "scene",

                script:
                    String(
                        scene?.script || ""
                    ),

                tts:
                    String(
                        scene?.tts ||
                        scene?.script ||
                        ""
                    ),

                subtitle:
                    String(
                        scene?.subtitle || ""
                    ),

                visualType:
                    "scene",

                imageQueries:
                    Array.isArray(
                        scene?.imageQueries
                    )
                        ? scene.imageQueries
                            .map(
                                item =>
                                    String(item || "")
                            )
                            .filter(Boolean)
                        : [],

                direction:
                    [
                        "hook",
                        "problem",
                        "emotion",
                        "reveal",
                        "detail",
                        "comparison",
                        "cta",
                        "ending"
                    ].includes(
                        scene?.direction
                    )
                        ? scene.direction
                        : (
                            scene?.type === "ending"
                                ? "ending"
                                : "detail"
                        ),

                shot:
                    [
                        "close_up",
                        "medium",
                        "wide",
                        "overhead",
                        "low_angle",
                        "high_angle"
                    ].includes(
                        scene?.shot
                    )
                        ? scene.shot
                        : "medium",

                cameraMove:
                    [
                        "push_in",
                        "pull_out",
                        "pan_left",
                        "pan_right",
                        "tilt_up",
                        "tilt_down",
                        "static"
                    ].includes(
                        scene?.cameraMove
                    )
                        ? scene.cameraMove
                        : "static",

                motion:
                    String(
                        scene?.motion ||
                        "static"
                    ),

                transition:
                    [
                        "cut",
                        "fade",
                        "flash",
                        "slide",
                        "zoom"
                    ].includes(
                        scene?.transition
                    )
                        ? scene.transition
                        : "cut",

                duration:
                    Number(
                        scene?.duration
                    ) > 0
                        ? Number(scene.duration)
                        : 5,

                sceneType:
                    format

            };


            return normalized;

        }
    );

}


/*
=====================================================
DIRECTOR
=====================================================
*/

export async function createAIDirector(
    topic = ""
){

    console.log(
        "[AI DIRECTOR] START"
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
        `[AI DIRECTOR] FORMAT : ${format}`
    );

    console.log(
        `[AI DIRECTOR] TOPIC : ${completedTopic}`
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


Selected Format:

${format}


위 정보를 바탕으로
최종 AI Shorts Director 결과를 만든다.

중요:

1.
키워드를 그대로 제목으로 사용하지 않는다.

2.
completedTopic을 기반으로
실제 영상에서 사용할 수 있는
완성된 대본과 장면을 만든다.

3.
모든 Scene에는
필수 필드를 빠짐없이 넣는다.

4.
Ranking이면 반드시 정확히 TOP 5다.

5.
Ranking이면 반드시
Hook + 5위 + 4위 + 3위 + 2위 + 1위 + Ending
총 7개 Scene이다.

6.
마지막 Scene은 반드시
type = "ending"이다.

7.
description은 반드시 빈 문자열이다.

8.
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
        "===== AI DIRECTOR RESULT ====="
    );

    console.log(result);

    console.log(
        "==================================="
    );


    /*
    =================================================
    4.
    JSON PARSE
    =================================================
    */

    const director =
        parseJSON(
            result
        );


    /*
    =================================================
    5.
    기본값 보정
    =================================================
    */

    director.title =
        String(
            director.title ||
            completedTopic ||
            topic ||
            "AI 이야기"
        ).trim();


    director.description =
        "";


    director.format =
        format;


    let scenes =
        director
            ?.work_instructions
            ?.scenes ||
        director
            ?.director_analysis
            ?.work_instructions
            ?.scenes ||
        director?.scenes ||
        [];


    scenes =
        normalizeScenes(
            scenes,
            format
        );


    /*
    =================================================
    6.
    RANKING 안전 검사
    =================================================
    */

    if(
        format === "ranking"
    ){

        if(
            scenes.length !== 7
        ){

            console.warn(
                `[AI DIRECTOR WARNING] Ranking Scene Count : ${scenes.length}`
            );

        }


        /*
        마지막 Scene 보정
        */

        if(
            scenes.length > 0
        ){

            scenes[
                scenes.length - 1
            ].type =
                "ending";

            scenes[
                scenes.length - 1
            ].sceneType =
                "ranking";

        }

    }


    /*
    =================================================
    7.
    GLOBAL 안전 검사
    =================================================
    */

    if(
        format === "global"
    ){

        if(
            scenes.length < 4 ||
            scenes.length > 6
        ){

            console.warn(
                `[AI DIRECTOR WARNING] Global Scene Count : ${scenes.length}`
            );

        }


        if(
            scenes.length > 0
        ){

            scenes[
                scenes.length - 1
            ].type =
                "ending";

            scenes[
                scenes.length - 1
            ].sceneType =
                "global";

        }

    }


    /*
    =================================================
    8.
    최종 scenes
    =================================================
    */

    director.scenes =
        scenes;


    /*
    =================================================
    9.
    work_instructions 동기화
    =================================================
    */

    if(
        !director.work_instructions ||
        typeof director.work_instructions !== "object"
    ){

        director.work_instructions = {};

    }


    director.work_instructions.scenes =
        scenes;


    /*
    =================================================
    COMPLETE
    =================================================
    */

    console.log(
        `[AI DIRECTOR] COMPLETE : ${scenes.length} SCENES`
    );


    return director;

}


/*
=====================================================
ALIAS
=====================================================
*/

export const createAiDirector =
    createAIDirector;

export const createArtificialIntelligenceDirector =
    createAIDirector;

