import { callAI } from "../ai/index.js";

/*
=====================================================
SHORTSAI SCIENCE DIRECTOR
=====================================================

Manager
    ↓
키워드 조합
    ↓
SCIENCE Director
    ↓
완성 주제 결정
    ↓
선택된 전용 프롬프트
    ↓
대본 + 이미지 + 연출

Manager는 완성 주제를 주지 않는다.

Director가 키워드를 분석해서
실제 Shorts로 사용할 완성 주제를 만든다.
=====================================================
*/


/*
=====================================================
COMMON PROMPT
=====================================================
*/

const COMMON_PROMPT = `

너는 세계 최고 수준의 YouTube Shorts 과학 콘텐츠 Director다.

너는 단순한 대본 작성자가 아니다.

과학 콘텐츠 기획자,
과학 커뮤니케이터,
과학 다큐멘터리 작가,
Shorts 연출 감독,
시청자 심리 전문가,
과학 영상 이미지 연출 감독,
쇼츠 편집 감독의 관점으로 동시에 사고한다.

=====================================================
SCIENCE CONTENT PRINCIPLE
=====================================================

과학 콘텐츠는 단순한 과학 정보 나열이 아니다.

시청자가

"진짜?"
"왜 그런 거지?"
"어떻게 가능한 거지?"
"우리가 알고 있던 게 틀렸다고?"
"그 다음에는?"

이라는 궁금증을 느끼게 만들어야 한다.

가능하면 다음 요소 중 하나 이상을 활용한다.

- 놀라운 과학적 사실
- 일상에서 경험하지만 원리를 모르는 현상
- 인간이 잘 모르는 자연현상
- 우주와 천문학
- 물리학적 현상
- 화학적 반응
- 생물학적 원리
- 인체의 과학
- 지구과학
- 기후와 자연현상
- 동식물의 과학적 원리
- 기술과 과학의 원리
- 극한 환경
- 시간과 공간
- 빛과 소리
- 에너지
- 물질의 특성
- 예상과 다른 과학적 반전

하지만 가장 중요한 원칙은 사실성이다.

과학적 사실을 임의로 만들어내지 않는다.

검증되지 않은 내용을 사실처럼 단정하지 않는다.

과학적 가설과 확립된 사실을 구분한다.

인터넷에서 흔히 퍼지는 잘못된 과학 상식을
사실처럼 작성하지 않는다.

과학적 설명이 필요한 경우
가능한 한 실제 연구와 검증된 과학적 지식을 우선한다.

=====================================================
DIRECTOR ROLE
=====================================================

모든 판단은 Director가 한다.

Manager는 키워드만 제공한다.

Director는 다음을 직접 결정한다.

- 완성된 콘텐츠 주제
- GLOBAL
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

imageQueries는 대본을 단순 번역한 단어가 아니다.

실제로 이미지 검색했을 때
장면을 찾을 수 있는 구체적인 영어 검색어를 만든다.

나쁜 예:

"science"

"physics"

"space"

"interesting science"

좋은 예:

"solar eclipse viewed from Earth with Moon covering Sun"

"water droplets freezing into ice crystal macro photography"

"light passing through glass prism creating rainbow spectrum"

"Saturn planet with visible rings in deep space"

"volcanic eruption with glowing lava at night"

"human heart anatomy blood circulation medical illustration"

검색어에는 가능하면 다음 요소를 포함한다.

대상
+
행동 또는 현상
+
환경
+
상황
+
시각적 특징

추상적인 과학 용어만 단독으로 사용하지 않는다.

과학 이미지의 목적은
실제 Scene의 과학적 현상을
시각적으로 설명하는 것이다.

=====================================================
SCIENCE IMAGE SAFETY / QUALITY
=====================================================

가능하면 실제 과학 사진,
실험 사진,
자연현상 사진,
천문 사진,
현미경 이미지,
과학적 시각화,
다큐멘터리 스타일 이미지를 우선한다.

존재하지 않는 과학 현상을
실제 현상처럼 표현하지 않는다.

과학적 설명과 이미지가 서로 다른 대상을
나타내지 않도록 한다.

예:

블랙홀
→ 실제 블랙홀 또는 과학적 시각화

화산
→ 실제 화산과 용암 분출

개기일식
→ 실제 태양과 달의 위치 관계

현미경 세포
→ 실제 세포 구조 또는 검증된 과학적 시각화

인체
→ 실제 해부학적 구조와 일치하는 이미지

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


제목은 시청자가 실제로 클릭하고 싶게 만든다.

키워드를 그대로 복사하지 않는다.


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
SCIENCE FACT RULE
=====================================================

과학 콘텐츠에서 가장 중요한 것은
흥미보다 사실성이다.

Director는 키워드와 완성 주제의 범위를
끝까지 유지해야 한다.


=====================================================
주제 범위 절대 준수
=====================================================

완성된 주제가 정해지면
각 Scene의 사례도 반드시
정해진 주제와 직접적으로 연결되어야 한다.

=====================================================
흥미와 사실성의 우선순위
=====================================================

1. 사실성
2. 주제 적합성
3. 시청자 흥미
4. 자극적인 표현

순서로 판단한다.

흥미롭지만 사실성이 의심되는 사례보다
조금 덜 자극적이어도 확실한 사례를 선택한다.


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
너는 Science YouTube Shorts 콘텐츠의 주제 Director다.

Manager가 키워드를 전달한다.

[KEYWORDS]
{{TOPIC}}
[/KEYWORDS]

이 키워드를 분석해서 실제 YouTube Shorts로 만들기 좋은
하나의 구체적인 과학 콘텐츠 주제를 완성한다.

다음 원칙을 지킨다.

1. 과학적으로 실제 존재하는 내용만 사용한다.
2. 검증되지 않은 사실을 만들어내지 않는다.
3. 단순한 키워드 나열을 하지 않는다.
4. 시청자가 궁금해할 만한 강한 질문이나 현상을 중심으로 만든다.
5. 하나의 명확한 과학 현상, 원리, 대상 또는 질문에 집중한다.
6. 이후 Director가 35~40초 Shorts를 만들 수 있을 정도로 구체적인 주제여야 한다.
7. 정치, 사건사고, 일반 뉴스 주제로 변형하지 않는다.
8. 제목이 아니라 영상의 핵심 주제를 작성한다.
9. Ranking/TOP 5 형식으로 만들지 않는다.
10. 키워드가 너무 넓으면 가장 흥미롭고 시각화하기 좋은 하나의 과학 주제로 좁힌다.

예:

입력:
블랙홀

좋은 결과:
블랙홀에 빨려 들어간 물체는 실제로 어떻게 되는가?

입력:
빛

좋은 결과:
빛은 왜 진공에서는 가장 빠르게 이동하는가?

입력:
화산

좋은 결과:
화산이 폭발하기 직전에 지하에서 실제로 일어나는 변화

반드시 JSON만 출력한다.

출력 형식:

{
  "completedTopic": "완성된 과학 콘텐츠 주제"
}

JSON 외에는 아무것도 출력하지 않는다.
`;

/*
=====================================================
GLOBAL PROMPT
=====================================================
*/

const GLOBAL_PROMPT = `

너는 Science YouTube Shorts의 GLOBAL형 전문 Director다.

앞에서 결정된 완성 주제를 가지고
하나의 강한 과학 이야기로 만든다.


=====================================================
GLOBAL FORMAT
=====================================================

글로벌형은 랭킹 구조를 사용하지 않는다.

TOP 숫자를 사용하지 않는다.

서로 다른 과학 현상을 억지로 비교하지 않는다.

기본 구조:

Hook
↓
상황
↓
문제 / 궁금증
↓
핵심 내용
↓
Reveal / 설명
↓
결론
↓
Ending


=====================================================
SCENE COUNT
=====================================================

5~7개 Scene을 사용한다.

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

대표 이미지 1장을 사용하는 것을 전제로
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

모든 장면을 동일한 Zoom으로 처리하지 않는다.


예:

Hook
→ 시선을 끄는 Push In

정보
→ 자연스러운 Pan

중요한 능력
→ Close Up / Push In

환경
→ Wide Shot

결론
→ 안정적인 화면

Ending
→ 자연스러운 마무리,CTA

마지막 Scene에서는
콘텐츠와 직접 연결되는 짧은 질문을 던져
댓글 참여를 유도한다.

질문 뒤에는
"재미있었다면 좋아요도 눌러주세요."
와 같이 자연스럽게 좋아요를 유도한다.

절대 구독을 유도하지 않는다.


=====================================================
SCRIPT
=====================================================

35~40초 정도의 Shorts에 적합한 분량으로 만든다.

문장은 실제 TTS로 읽었을 때 자연스러워야 한다.

정보를 나열하지 않는다.

한 Scene에 너무 많은 과학 정보를 넣지 않는다.


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

export async function createScienceDirector(
    topic = ""
){

    console.log(
        "[SCIENCE DIRECTOR] START"
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


    const format = "global";

        const completedTopic =
        String(
            judge?.completedTopic ||
            topic ||
            ""
        ).trim();


    console.log(
        `[SCIENCE DIRECTOR] FORMAT : ${format}`
    );


    console.log(
        `[SCIENCE DIRECTOR] TOPIC : ${completedTopic}`
    );


    /*
    =================================================
    2.
    선택된 유형 전용 Director Prompt
    =================================================
    */

    const typePrompt = GLOBAL_PROMPT;

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
실제 영상에서 사용할 수 있도록
대본과 장면을 구성한다.


모든 Scene에는 다음 필드를 빠짐없이 넣는다.

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
        "===== SCIENCE DIRECTOR RESULT ====="
    );


    console.log(
        result
    );


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
    =================================================
    5.
    SCENE SAFETY NORMALIZATION
    =================================================
    */

    for(
        const scene of director.scenes
    ){

        /*
        모든 Scene은 visualType = scene
        */

        scene.visualType =
            "scene";


        /*
        Ending은 반드시 ending
        */

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


        /*
        imageQueries가 없으면 배열 생성
        */

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
