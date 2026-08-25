import { callAI } from "../ai/index.js";
import { getRecentDuplicates } from "../services/duplicateService.js";

/*
=====================================================
SHORTSAI SCIENCE DIRECTOR
=====================================================

Manager
    ↓
키워드
    ↓
SCIENCE Director
    ↓
주제 의미 분석 + 중복 판단
    ↓
완성 주제 결정
    ↓
생활과학 Shorts 설계
    ↓
한국어 + 중국어
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

너는 YouTube Shorts의 생활과학 Director다.

Manager가 전달하는 키워드와 정보를 바탕으로
하나의 완성도 높은 생활과학 Shorts 콘텐츠를 기획한다.
영상의 길이는 45~60초로 제작한다.

정해진 공식을 반복해서 실행하는 것이 아니라
주제의 의미를 먼저 이해하고,
이 주제를 시청자에게 가장 잘 전달할 방법을
스스로 생각하고 결정한다.

생활 속에서 실제로 경험할 수 있는 현상과
그 뒤에 있는 과학적 원리를 연결한다.

전문 과학 지식을 억지로 생활에 끼워 넣지 않는다.

생활 속 궁금증,
의외의 현상,
일상에서 자주 경험하는 문제,
직관과 다른 결과 등을 발견하고
그 이유를 과학적으로 설명한다.

영상의 시작 방식,
정보를 보여주는 순서,
Scene 수,
각 Scene의 duration,
시각적 표현,
전환,
마지막 메시지를
주제와 정보량에 맞게 스스로 결정한다.

각 영상은 주제에 따라
서로 다른 흐름을 가질 수 있다.

최근 사용된 콘텐츠가 제공되면
제목이나 단어가 같은지만 보는 것이 아니라
핵심 질문,
핵심 현상,
핵심 원인,
핵심 결과,
핵심 의미를 비교하여
실질적인 중복 여부를 판단한다.

사실이 아닌 내용을 만들어내지 않는다.

확실하지 않은 과학적 사실을
사실처럼 단정하지 않는다.

특히 건강,
치료,
질병,
다이어트,
독성,
전자파,
식품 안전,
화학물질 위험과 관련된 내용은
근거 없는 주장을 만들지 않는다.

imageQueries는 실제 이미지와 영상 검색에 사용하는
영어 검색어다.

대본을 단순히 영어로 번역하지 않는다.

각 검색어는 해당 Scene의 내용을
실제로 시각적으로 표현할 수 있어야 한다.

같은 Scene의 검색어를
단어만 바꿔 반복하지 않는다.

subtitle은 해당 Scene의 TTS가 전달하는
핵심 의미와 정보를 자연스럽게 전달한다.

voice의 핵심 정보를 지나치게 축약하지 않는다.

마지막 Scene에는
콘텐츠와 자연스럽게 연결되는 마무리를 만든다.

파이프라인에서 요구하는 다음 필드는 반드시 작성한다.

type
script
tts
subtitle
zh
visualType
imageQueries
direction
shot
cameraMove
motion
transition
duration
sceneType

visualType은 반드시 "scene"을 사용한다.

JSON 외에는 출력하지 않는다.

`;


/*
=====================================================
TYPE JUDGE
=====================================================
*/

const TYPE_JUDGE_PROMPT = `

너는 ShortsAI 생활과학 채널의 주제 Director다.

Manager가 전달한 키워드는 완성된 콘텐츠가 아니다.

먼저 키워드의 의미를 이해한다.

그 키워드에서 만들 수 있는 여러 생활과학 콘텐츠 방향을 생각하고,
그중 실제 Shorts로 만들었을 때 가장 좋은 하나의 방향을 선택한다.

단순히 키워드를 제목처럼 이어 붙이지 않는다.

사람들이 실제로 경험하거나 궁금해할 만한
구체적인 생활 속 현상을 찾는다.

그 현상을 과학적으로 설명할 수 있는
구체적인 콘텐츠 주제로 완성한다.

전문 과학 지식을 설명하기 위해
생활 사례를 억지로 붙이지 않는다.

생활 속 현상에서 출발해
사람들이 가질 만한 궁금증과
그 뒤의 과학적 원리를 연결한다.

최근 사용된 콘텐츠가 제공되면
표현이 다른지만 비교하지 않는다.

핵심 질문,
핵심 현상,
핵심 원인,
핵심 결과,
핵심 정보와 의미를 비교한다.

기존 콘텐츠와 실질적으로 같은 내용이면
다른 관점의 새로운 주제를 선택한다.

같은 분야나 같은 대상을 다룬다는 이유만으로
중복으로 판단하지 않는다.

생활과 연결되지 않는
순수 전문 과학 주제는 피한다.

다음과 같은 방향을 우선한다.

- 많은 사람이 경험할 가능성이 높은 현상
- 제목을 봤을 때 궁금증이 생기는 현상
- 짧은 영상으로 설명할 수 있는 현상
- 과학적으로 설명할 수 있는 현상
- 시각적으로 표현할 수 있는 현상
- 블로그 글로 확장하기 좋은 현상

인터넷 속설이나 확인되지 않은 주장을
사실처럼 만들지 않는다.

최종적으로 하나의 구체적인 완성 주제를 결정한다.

JSON만 출력한다.

{
  "format": "global",
  "completedTopic": "",
  "reason": ""
}

format은 반드시 "global"이다.

`;


/*
=====================================================
GLOBAL PROMPT
=====================================================
*/

const GLOBAL_PROMPT = `

너는 생활과학 YouTube Shorts의 전문 Director다.

앞에서 결정된 completedTopic을
하나의 완성된 Shorts 영상으로 만든다.

먼저 주제의 핵심을 이해한다.

이 내용을 제한된 영상 시간 안에서
어떤 순서로 보여주는 것이 가장 좋은지
스스로 판단한다.

첫 Scene은 배경·시대·장소 설명으로 시작하지 말고, 시청자가 다음 내용을 계속 보고 싶게 만드는 사건·결과·의문·반전 등 핵심 관심거리를 먼저 제시한 뒤 필요한 배경 설명으로 이어간다.

주제에 가장 적합한 시작 방식을
스스로 선택한다.

정보를 보여주는 순서,
Scene 수,
각 Scene의 duration,
전환,
시각적 표현,
마지막 메시지도
주제에 맞게 스스로 결정한다.

각 Scene은 전체 이야기에서
필요한 역할을 가져야 한다.

같은 내용을 다른 Scene에서 반복하지 않는다.

생활 속 경험에서 시작할 수도 있고,
의외의 결과를 먼저 보여줄 수도 있으며,
주제에 따라 가장 효과적인 방식으로
자유롭게 구성한다.

전문 과학 강의처럼 만들지 않는다.

과학적 원리는 정확하게 유지하되
시청자가 쉽게 이해할 수 있도록 설명한다.

전문 용어가 필요한 경우에는
생활 속 표현과 함께 자연스럽게 설명한다.

=====================================================
IMAGE
=====================================================

각 Scene에는
실제로 검색할 수 있는 영어 imageQueries를
2~3개 작성한다.

검색어는 대본을 영어로 번역한 문장이 아니다.

해당 Scene에서 실제로 보여줘야 하는
시각적 내용을 검색할 수 있도록 작성한다.

검색어만 보더라도
어떤 장면을 찾아야 하는지 이해할 수 있어야 한다.

같은 Scene에서
단어만 바꾼 검색어를 반복하지 않는다.

현재 Scene에서 설명하지 않은
새로운 원인이나 결과를 검색어에 추가하지 않는다.

추상적인 과학 용어만 사용하지 않는다.

나쁜 예:

"physics"
"science"
"heat"
"electricity"
"cooling principle"

좋은 방향:

실제 생활 장면,
실제 사물,
실제 현상,
실험 장면,
근접 촬영,
결과가 보이는 장면,
필요한 경우 과학적 시각화

등을 사용한다.

Director는 이미지를 선택하지 않는다.

Director는 검색어만 작성한다.

URL,
이미지 ID,
사이트명,
상품명,
특정 검색 결과를 넣지 않는다.


=====================================================
SCRIPT
=====================================================

전체 영상 길이는
주제와 정보량에 맞게 스스로 결정한다.

지나치게 장황하게 설명하지 않는다.

정보를 백과사전처럼 나열하지 않는다.

한 Scene에 너무 많은 정보를 넣지 않는다.

시청자가 내용을 이해하고
"아, 그래서 그랬구나"
라고 느낄 수 있도록 구성한다.


=====================================================
SUBTITLE
=====================================================

subtitle은 TTS를 단순히 짧게 줄인 문구가 아니다.

TTS가 전달하는 핵심 사실,
원인,
결과,
조건,
수치,
중요한 정보를
시청자가 자막만 읽어도 이해할 수 있도록 작성한다.

짧게 만드는 것보다
정보를 정확하게 전달하는 것을 우선한다.

TTS에 없는 새로운 정보를 subtitle에 추가하지 않는다.


=====================================================
ENDING
=====================================================

마지막 Scene은
영상의 내용과 자연스럽게 연결되는 방식으로 마무리한다.

콘텐츠에 적합하다면
짧은 질문을 통해 댓글 참여를 유도할 수 있다.

억지로 동일한 CTA 문장을 반복하지 않는다.

좋아요나 댓글 등의 유도 역시
주제와 흐름에 자연스럽게 맞춰 판단한다.

구독 유도는 하지 않는다.


=====================================================
CHINESE VERSION
=====================================================

한국어 원본과 동일한 내용의
중국어 버전을 함께 생성한다.

중국어 버전은 새로운 콘텐츠를 기획하는 것이 아니다.

한국어 원본의 의미와 정보를 유지하면서
중국 본토 시청자가 자연스럽게 이해할 수 있는
간체 중국어로 번역한다.

다음 내용을 변경하지 않는다.

- 사실
- 원인
- 결과
- 인과관계
- 수치
- 단위
- 시간
- 조건
- 비교
- 핵심 정보
- 과학적 주장

원본에 없는 새로운 정보를 추가하지 않는다.

원본의 정보를 삭제하지 않는다.

원본보다 더 강한 표현을 사용하지 않는다.

원본보다 더 자극적인 표현을 추가하지 않는다.

과학적으로 이상해 보이는 원문이라도
중국어 번역 과정에서 임의로 수정하지 않는다.

중국어 문장을 자연스럽게 만들기 위한
문장 구조 변경은 허용한다.

단,
의미와 정보는 동일해야 한다.

한국어의

script
tts
subtitle

을 각각 중국어로 번역하여
zh 객체에 작성한다.

장면 구조와 시각적 연출은
중국어 번역 때문에 변경하지 않는다.


=====================================================
OUTPUT
=====================================================

{
  "title": "",
  "zhTitle": "",
  "description": "",
  "format": "global",
  "work_instructions": {
    "scenes": [
      {
        "type": "",
        "script": "",
        "tts": "",
        "subtitle": "",
        "zh": {
          "script": "",
          "tts": "",
          "subtitle": ""
        },
        "visualType": "scene",
        "imageQueries": [],
        "direction": "",
        "shot": "",
        "cameraMove": "",
        "motion": "",
        "transition": "",
        "duration": 0,
        "sceneType": "global"
      }
    ]
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

    let json =
        String(result || "")
            .replace(/^```json/i, "")
            .replace(/^```/i, "")
            .replace(/```$/i, "")
            .trim();


    let normalized = "";
    let inString = false;
    let escaped = false;


    for(
        let i = 0;
        i < json.length;
        i++
    ){

        const char =
            json[i];


        if(
            escaped
        ){

            normalized +=
                char;

            escaped =
                false;

            continue;

        }


        if(
            char === "\\"
        ){

            normalized +=
                char;

            escaped =
                true;

            continue;

        }


        if(
            char === '"'
        ){

            normalized +=
                char;

            inString =
                !inString;

            continue;

        }


        if(
            inString
        ){

            if(
                char === "\n"
            ){

                normalized +=
                    "\\n";

                continue;

            }


            if(
                char === "\r"
            ){

                normalized +=
                    "\\r";

                continue;

            }


            if(
                char === "\t"
            ){

                normalized +=
                    "\\t";

                continue;

            }


            const code =
                char.charCodeAt(0);


            if(
                code < 32
            ){

                normalized +=
                    "\\u" +
                    code
                        .toString(16)
                        .padStart(4, "0");

                continue;

            }

        }


        normalized +=
            char;

    }


    try{

        return JSON.parse(
            normalized
        );

    }
    catch(error){

        console.error(
            "[SCIENCE DIRECTOR] JSON PARSE FAILED"
        );

        console.error(
            error.message
        );

        throw error;

    }

}


/*
=====================================================
SCENE NORMALIZER
=====================================================
*/

function normalizeScenes(
    scenes
){

    if(
        !Array.isArray(scenes)
    ){

        return [];

    }


    return scenes.map(
        scene => {

            return {

                type:
                    scene?.type ||
                    "scene",

                script:
                    String(
                        scene?.script ||
                        ""
                    ),

                tts:
                    String(
                        scene?.tts ||
                        scene?.script ||
                        ""
                    ),

                subtitle:
                    String(
                        scene?.subtitle ||
                        ""
                    ),

                zh: {
                    script:
                        String(
                            scene?.zh?.script ||
                            ""
                        ).trim(),

                    tts:
                        String(
                            scene?.zh?.tts ||
                            ""
                        ).trim(),

                    subtitle:
                        String(
                            scene?.zh?.subtitle ||
                            ""
                        ).trim()
                },

                visualType:
                    "scene",

                imageQueries:
                    Array.isArray(
                        scene?.imageQueries
                    )
                        ? scene.imageQueries
                            .map(
                                item =>
                                    String(
                                        item || ""
                                    )
                                        .replace(
                                            /\s+/g,
                                            " "
                                        )
                                        .trim()
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
                        ? Number(
                            scene.duration
                        )
                        : 5,

                sceneType:
                    "global"

            };

        }
    );

}


/*
=====================================================
SCIENCE DIRECTOR SCENE SAFETY
=====================================================
*/

function validateScienceSceneSafety(
    scenes
){

    if(
        !Array.isArray(scenes) ||
        scenes.length === 0
    ){

        throw new Error(
            "[SCIENCE DIRECTOR] FAILED : NO SCENES"
        );

    }


    for(
        let i = 0;
        i < scenes.length;
        i++
    ){

        const scene =
            scenes[i];

        const sceneNumber =
            i + 1;


        /*
        =================================================
        IMAGE QUERIES
        =================================================
        */

        if(
            !Array.isArray(
                scene.imageQueries
            )
        ){

            throw new Error(
                `[SCIENCE DIRECTOR] FAILED : SCENE ${sceneNumber} HAS NO IMAGE QUERIES`
            );

        }


        if(
            scene.imageQueries.length < 2
        ){

            throw new Error(
                `[SCIENCE DIRECTOR] FAILED : SCENE ${sceneNumber} IMAGE QUERIES LESS THAN 2`
            );

        }


        if(
            scene.imageQueries.length > 3
        ){

            throw new Error(
                `[SCIENCE DIRECTOR] FAILED : SCENE ${sceneNumber} IMAGE QUERIES MORE THAN 3`
            );

        }


        for(
            const query of scene.imageQueries
        ){

            if(
                !String(
                    query || ""
                ).trim()
            ){

                throw new Error(
                    `[SCIENCE DIRECTOR] FAILED : SCENE ${sceneNumber} HAS EMPTY IMAGE QUERY`
                );

            }

        }


        /*
        =================================================
        CHINESE VERSION
        =================================================
        */

        if(
            !scene.zh ||
            typeof scene.zh !== "object" ||
            Array.isArray(scene.zh)
        ){

            throw new Error(
                `[SCIENCE DIRECTOR] FAILED : SCENE ${sceneNumber} CHINESE STRUCTURE ERROR`
            );

        }


        if(
            !scene.zh.script
        ){

            throw new Error(
                `[SCIENCE DIRECTOR] FAILED : SCENE ${sceneNumber} CHINESE SCRIPT EMPTY`
            );

        }


        if(
            !scene.zh.tts
        ){

            throw new Error(
                `[SCIENCE DIRECTOR] FAILED : SCENE ${sceneNumber} CHINESE TTS EMPTY`
            );

        }


        if(
            !scene.zh.subtitle
        ){

            throw new Error(
                `[SCIENCE DIRECTOR] FAILED : SCENE ${sceneNumber} CHINESE SUBTITLE EMPTY`
            );

        }

    }


    return true;

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
    키워드 → 완성 주제
    =================================================
    */

    const recentDuplicates =
        await getRecentDuplicates();


    const duplicateTopics =
        recentDuplicates.length > 0
            ? recentDuplicates
                .map(
                    item =>
                        `- ${item.topic}`
                )
                .join("\n")
            : "(최근 7일 중복 주제 없음)";


    const judgePrompt =
        TYPE_JUDGE_PROMPT
            .replace(
                "{{TOPIC}}",
                String(
                    topic || ""
                )
            )
            .replace(
                "{{DUPLICATE_TOPICS}}",
                duplicateTopics
            );


    const judgeResult =
        await callAI(
            judgePrompt
        );


    const judge =
        parseJSON(
            judgeResult
        );


    /*
    =================================================
    SCIENCE FORMAT
    =================================================
    */

    const format =
        "global";


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
    FINAL DIRECTOR PROMPT
    =================================================
    */

    const finalPrompt = `

${COMMON_PROMPT}

${GLOBAL_PROMPT}

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
최종 생활과학 Shorts Director 결과를 만든다.

Director는 completedTopic의 의미를 이해한 뒤
영상 전체를 스스로 설계한다.

고정된 Scene 수나 고정된 전개 공식을
사용할 필요가 없다.

주제에 가장 적합한

영상 흐름,
Scene 구성,
Hook,
대본,
TTS,
자막,
시각자료,
연출,
Scene duration

을 스스로 판단한다.

단,
현재 파이프라인이 사용할 수 있는
필수 JSON 구조는 유지한다.

모든 Scene에는 다음 필드를 작성한다.

type
script
tts
subtitle
zh
visualType
imageQueries
direction
shot
cameraMove
motion
transition
duration
sceneType

imageQueries는 각 Scene마다
2~3개를 작성한다.

중국어는 한국어 원본의 내용을
그대로 번역한다.

중국어에서 새로운 내용을 만들지 않는다.

description은 빈 문자열이다.

JSON 외에는 절대 출력하지 않는다.

`;


    /*
    =================================================
    3.
    FINAL DIRECTOR
    =================================================

    중국어 결과 구조가 잘못되면
    결과를 폐기하고 다시 호출한다.

    최대 2회.
    =================================================
    */

    const MAX_DIRECTOR_ATTEMPTS = 2;

    let director = null;
    let lastDirectorError = null;


    for(
        let attempt = 1;
        attempt <= MAX_DIRECTOR_ATTEMPTS;
        attempt++
    ){

        console.log(
            `[SCIENCE DIRECTOR] GENERATION ATTEMPT ${attempt}/${MAX_DIRECTOR_ATTEMPTS}`
        );


        try{

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


            const candidate =
                parseJSON(
                    result
                );


            /*
            =================================================
            BASIC NORMALIZATION
            =================================================
            */

            candidate.title =
                String(
                    candidate.title ||
                    completedTopic ||
                    ""
                ).trim();


            candidate.zhTitle =
                String(
                    candidate.zhTitle ||
                    ""
                ).trim();


            candidate.description =
                "";


            candidate.format =
                format;


            let scenes =
                candidate
                    ?.work_instructions
                    ?.scenes ||
                candidate
                    ?.director_analysis
                    ?.work_instructions
                    ?.scenes ||
                candidate?.scenes ||
                [];


            /*
            =================================================
            SCENE NORMALIZATION
            =================================================
            */

            scenes =
                normalizeScenes(
                    scenes
                );


            /*
            =================================================
            SCENE VALIDATION
            =================================================
            */

            validateScienceSceneSafety(
                scenes
            );


            /*
            =================================================
            ENDING SAFETY
            =================================================
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
                    "global";

                scenes[
                    scenes.length - 1
                ].direction =
                    "ending";

            }


            /*
            =================================================
            FINAL RESULT
            =================================================
            */

            candidate.scenes =
                scenes;


            if(
                !candidate.work_instructions ||
                typeof candidate.work_instructions !== "object"
            ){

                candidate.work_instructions =
                    {};

            }


            candidate.work_instructions.scenes =
                scenes;


            director =
                candidate;


            console.log(
                `[SCIENCE DIRECTOR] CHINESE VALIDATION PASS : ${scenes.length} scenes`
            );


            break;

        }
        catch(error){

            lastDirectorError =
                error;


            console.error(
                `[SCIENCE DIRECTOR] ATTEMPT ${attempt} FAILED :`,
                error.message
            );


            if(
                attempt <
                MAX_DIRECTOR_ATTEMPTS
            ){

                console.log(
                    "[SCIENCE DIRECTOR] 결과 검증 실패 → Director 재호출"
                );

            }

        }

    }


    /*
    =================================================
    FINAL FAILURE
    =================================================
    */

    if(
        !director
    ){

        throw new Error(
            "SCIENCE DIRECTOR 결과 검증 실패 : " +
            (
                lastDirectorError?.message ||
                "알 수 없는 오류"
            )
        );

    }


    console.log(
        `[SCIENCE DIRECTOR] COMPLETE : ${director.scenes.length} SCENES`
    );


    return director;

}
