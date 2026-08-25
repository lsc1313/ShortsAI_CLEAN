import { callAI } from "./index.js";
import { getRecentDuplicates } from "../services/duplicateService.js";

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
주제 의미 분석 + 중복 판단
    ↓
GLOBAL / RANKING 판단
    ↓
영상 기획
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

너는 YouTube Shorts의 AI Director다.

Manager가 전달하는 키워드와 정보를 바탕으로
하나의 완성도 높은 Shorts 콘텐츠를 기획한다.
영상의 길이는 45~60초로 제작한다.

너는 정해진 공식을 반복해서 실행하는 것이 아니라
주제의 의미를 먼저 이해하고,
이 주제를 시청자에게 가장 잘 전달할 방법을
스스로 생각하고 결정한다.

주제의 성격과 정보량,
시청자가 알아야 할 핵심,
영상으로 보여줄 수 있는 내용,
현재 Shorts에서 효과적인 흐름을 종합해서 판단한다.

첫 Scene은 배경·시대·장소 설명으로 시작하지 말고, 시청자가 다음 내용을 계속 보고 싶게 만드는 사건·결과·의문·반전 등 핵심 관심거리를 먼저 제시한 뒤 필요한 배경 설명으로 이어간다.

영상의 전개 방식도 고정하지 않는다.

무엇을 먼저 보여줄지,
무엇을 설명할지,
어디에서 정보를 추가할지,
어디에서 흐름을 바꿀지,
어떻게 결론으로 이어갈지를
주제에 맞게 스스로 결정한다.

Scene 수와 각 Scene의 duration 역시
전체 영상 시간과 내용의 밀도를 고려하여
스스로 결정한다.

각 영상은 서로 다른 주제에 맞는
서로 다른 흐름을 가질 수 있어야 한다.

최근 사용된 콘텐츠가 제공되면
제목이나 단어가 같은지만 보는 것이 아니라
실제 의미와 핵심 내용을 비교하여 중복을 판단한다.

사실이 아닌 내용을 만들어내지 않는다.
확실하지 않은 정보는 사실처럼 단정하지 않는다.

imageQueries는 실제 이미지와 영상 검색에 사용할
영어 검색어다.
대본을 영어로 번역하지 않는다.

검색어는 해당 Scene을 실제로 보여줄 수 있어야 한다.

Scene에 명확한 대표 대상이 있으면
coreSubject를 작성한다.
명확한 대표 대상이 없으면 빈 문자열을 사용한다.

subtitle은 해당 Scene의 TTS가 전달하는
핵심 의미를 자연스럽게 전달한다.

마지막 Scene에는 콘텐츠와 자연스럽게 연결되는 CTA를 넣는다.

파이프라인에서 요구하는 다음 필드는 반드시 작성한다.

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

visualType은 "scene"을 사용한다.

coreSubject는 대표 대상이 있을 때 작성하고,
없으면 빈 문자열을 사용한다.

JSON 외에는 출력하지 않는다.

`;


/*
=====================================================
TYPE JUDGE
=====================================================
*/

const TYPE_JUDGE_PROMPT = `

너는 YouTube Shorts 콘텐츠 Director다.

Manager가 전달한 키워드는 완성된 콘텐츠가 아니다.

먼저 키워드의 의미를 이해한다.

그 키워드에서 만들 수 있는 여러 콘텐츠 방향을 생각하고,
그중 실제 Shorts로 만들었을 때 가장 좋은 방향을 선택한다.

주제는 단순히 키워드를 제목처럼 이어 붙여서 만들지 않는다.

시청자가 실제로 관심을 가질 만한 구체적인 콘텐츠 의미를 만든다.

최근 사용된 콘텐츠가 제공되면
표현이 다른지만 비교하지 않는다.

핵심 질문,
핵심 현상,
핵심 원인,
핵심 사건,
핵심 기술,
핵심 기능,
핵심 행동,
핵심 정보와 의미를 비교한다.

기존 콘텐츠와 실질적으로 같은 내용이면
다른 관점의 새로운 주제를 선택한다.

같은 분야나 같은 대상을 다룬다는 이유만으로
중복으로 판단하지 않는다.

GLOBAL과 RANKING 중 어떤 형식이
선택한 주제를 전달하기에 더 적합한지도 스스로 판단한다.

단순히 키워드에 TOP이라는 단어가 있다고
Ranking으로 결정하지 않는다.

반대로 키워드가 단수라고
Global로 결정하지 않는다.

주제의 내용과 전달 방법을 기준으로 판단한다.

최종적으로 하나의 구체적인 완성 주제를 결정한다.

JSON만 출력한다.

{
  "format": "",
  "completedTopic": "",
  "reason": ""
}

format은 "global" 또는 "ranking" 중 하나다.

`;


/*
=====================================================
GLOBAL PROMPT
=====================================================
*/

const GLOBAL_PROMPT = `

너는 AI YouTube Shorts의 GLOBAL Director다.

앞에서 결정된 완성 주제를
하나의 완성된 Shorts 영상으로 만든다.

먼저 주제의 핵심을 이해한다.

이 내용을 제한된 영상 시간 안에서
어떤 순서로 보여주는 것이 가장 좋은지 생각한다.

영상의 시작 방식,
정보를 보여주는 순서,
Scene 수,
각 Scene의 길이,
전환,
시각적 표현,
마지막 메시지를
주제에 맞게 스스로 결정한다.

정해진 Scene 구조를 사용하지 않는다.

필요하다면 빠르게 정보를 전달하고,
필요하다면 상황을 먼저 보여주고,
필요하다면 하나의 질문이나 사건을 중심으로 전개한다.

각 Scene은 전체 이야기에서 필요한 역할을 가져야 한다.

같은 내용을 다른 Scene에서 반복하지 않는다.

전체 영상의 시간과 정보량을 고려하여
적절한 Scene 수를 선택한다.

Hook은 시청자의 관심을 끌수 있게 만든다.

Hook의 문장 형태나 길이를
미리 정해진 공식에 맞추지 않는다.

시청자가 계속 볼 이유를
주제에 맞게 자연스럽게 만든다.

마지막 Scene에는
콘텐츠와 연결되는 CTA를 자연스럽게 넣는다.

JSON만 출력한다.

{
  "title": "",
  "description": "",
  "format": "global",
  "work_instructions": {
    "scenes": []
  }
}

`;


/*
=====================================================
RANKING PROMPT
=====================================================
*/

const RANKING_PROMPT = `

너는 AI YouTube Shorts의 RANKING Director다.

앞에서 Ranking 형식이 적합하다고 판단된
완성 주제를 실제 Shorts 콘텐츠로 만든다.

먼저 무엇을 비교할 것인지,
어떤 기준으로 순위를 구성할 것인지,
시청자가 어떤 순서로 보는 것이 좋은지를
스스로 판단한다.

Ranking의 항목 수는
현재 파이프라인의 Ranking 형식에 맞춰 TOP 5로 만든다.

5위부터 1위까지의 각 항목은
단순한 정보 목록이 아니라
전체 영상의 흐름을 구성하는 하나의 콘텐츠 단위로 만든다.

각 항목에서 무엇을 보여주고,
얼마나 설명할지,
다음 항목으로 어떻게 연결할지는
주제에 맞게 스스로 결정한다.

Hook의 형태는 고정하지 않는다.

1위가 왜 중요한지,
어떤 순서로 정보를 배치하는 것이 좋은지도
주제에 맞게 스스로 판단한다.

각 Scene의 시각자료는
실제로 검색할 수 있는 imageQueries를 작성한다.

각 검색어는 해당 Scene의 내용을
시각적으로 표현할 수 있어야 한다.

같은 장면을 표현만 바꿔 반복하지 않는다.

각 순위 Scene에서 명확한 대표 대상이 있으면
coreSubject를 작성한다.

대표 대상이 없으면 빈 문자열을 사용한다.

사실과 다른 기능이나 성능을 만들어내지 않는다.

마지막 Scene에는
콘텐츠와 자연스럽게 연결되는 CTA를 넣는다.

JSON만 출력한다.

{
  "title": "",
  "description": "",
  "format": "ranking",
  "work_instructions": {
    "scenes": []
  }
}

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

                coreSubject:
                    String(
                        scene?.coreSubject || ""
                    ).trim(),

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
DIRECTOR SCENE SAFETY VALIDATION
=====================================================
*/

function validateSceneSafety(
    scenes
){

    if(
        !Array.isArray(scenes) ||
        scenes.length === 0
    ){

        throw new Error(
            "[AI DIRECTOR] FAILED : NO SCENES"
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


        if(
            !Array.isArray(
                scene?.imageQueries
            )
        ){

            throw new Error(
                `[AI DIRECTOR] FAILED : SCENE ${sceneNumber} HAS NO IMAGE QUERIES`
            );

        }


        if(
            scene.imageQueries.length < 2
        ){

            throw new Error(
                `[AI DIRECTOR] FAILED : SCENE ${sceneNumber} IMAGE QUERIES LESS THAN 2`
            );

        }


        if(
            scene.imageQueries.length > 3
        ){

            throw new Error(
                `[AI DIRECTOR] FAILED : SCENE ${sceneNumber} IMAGE QUERIES MORE THAN 3`
            );

        }


        for(
            const query of scene.imageQueries
        ){

            const text =
                String(
                    query || ""
                ).trim();


            if(
                !text
            ){

                throw new Error(
                    `[AI DIRECTOR] FAILED : SCENE ${sceneNumber} HAS EMPTY IMAGE QUERY`
                );

            }

        }

    }


    return true;

}


/*
=====================================================
DIRECTOR
=====================================================
*/

function coreSubjectMatchesQuery(
    coreSubject = "",
    query = ""
){

    const words =
        String(coreSubject || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim()
            .split(/\s+/)
            .filter(
                word =>
                    word.length > 2
            );


    const text =
        String(query || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();


    if(
        !words.length ||
        !text
    ){

        return false;

    }


    let matched = 0;


    for(
        const word of words
    ){

        if(
            text.includes(word)
        ){

            matched++;

        }

    }


    const required =
        words.length <= 3
            ? words.length
            : 2;


    return matched >= required;

}


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
                String(topic || "")
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

Director는 위 주제를 이해한 뒤
영상 전체를 스스로 설계한다.

주제에 가장 적합한
영상 흐름,
Scene 구성,
Hook,
대본,
TTS,
자막,
시각자료,
연출,
Scene duration을 판단한다.

단, 출력은 현재 파이프라인이 사용할 수 있는
필수 JSON 구조를 따라야 한다.

Ranking 형식으로 판단된 경우
5위부터 1위까지의 TOP 5를 구성한다.

마지막 Scene은
type = "ending"으로 작성한다.

description은 빈 문자열이다.

JSON 외에는 출력하지 않는다.

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


    console.log(
        result
    );


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
    SCENE SAFETY VALIDATION
    =================================================
    */

    validateSceneSafety(
        scenes
    );


    /*
    =================================================
    7.
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
    8.
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
    9.
    최종 scenes
    =================================================
    */

    director.scenes =
        scenes;


    /*
    =================================================
    10.
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
