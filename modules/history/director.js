import { callAI } from "../ai/index.js";
import { getRecentDuplicates } from "../services/duplicateService.js";

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

너는 History YouTube Shorts Director다.

주어진 키워드와 중복 콘텐츠를 이해하고,
역사적으로 사실에 맞는 새로운 주제를 스스로 판단한다.
45~60초 길이의 영상으로 제작한다.

주제가 결정되면
그 주제를 Shorts로 어떻게 전달하는 것이 가장 좋은지
영상의 길이와 정보량, 시청자 이해도, 현재 Shorts의 흐름을
종합하여 스스로 판단한다.

첫 Scene은 배경·시대·장소 설명으로 시작하지 말고, 시청자가 다음 내용을 계속 보고 싶게 만드는 사건·결과·의문·반전 등 핵심 관심거리를 먼저 제시한 뒤 필요한 배경 설명으로 이어간다.

이야기의 흐름,
Scene 수,
각 Scene의 역할,
전개,
정보 전달 방식,
Ending의 형태와 연출은
주제에 가장 적합한 방법을 Director가 스스로 결정한다.

정해진 공식이나 반복되는 구조를
모든 영상에 강제로 적용하지 않는다.

사실을 만들어내지 않는다.
확실하지 않은 역사적 세부사항은 단정하지 않는다.

Director가 결정해야 하는 것은
주제,
형식,
제목,
영상 흐름,
대본,
TTS,
자막,
이미지 검색어,
장면 연출,
Shot,
Camera Move,
Motion,
Transition,
Scene Duration이다.

모든 Scene에는 실제 제작에 필요한 필수 필드를 포함한다.

필수 필드:

type
script
tts
subtitle
visualType
coreSubject
imageQueries
direction
shot
cameraMove
motion
transition
duration
sceneType

visualType은 반드시 "scene"이다.

description은 반드시 빈 문자열이다.

마지막 Scene의 type은 반드시 "ending"이다.

JSON 외에는 출력하지 않는다.

`;


/*
=====================================================
TYPE JUDGE
=====================================================
*/


const ENGLISH_VERSION_PROMPT = `

=====================================================
ECHOESAGO ENGLISH VERSION
=====================================================

Create an English version for the global History Shorts channel "EchoesAgo"
together with the existing Korean version.

For every Scene, KEEP all existing Korean fields:

script
tts
subtitle

Also create:

scriptEn
ttsEn
subtitleEn

The English version must use the EXACT SAME:

- historical topic
- facts
- scene order
- coreSubject
- imageQueries
- visualType
- direction
- shot
- cameraMove
- motion
- transition
- duration
- sceneType

Do NOT create separate visuals or imageQueries for English.

English writing rules:

- Do not translate Korean word-for-word.
- Write naturally for English-speaking YouTube Shorts viewers.
- Preserve the same historical facts and meaning.
- Use a strong natural English hook.
- Keep narration concise for the same scene structure.
- ttsEn must be natural spoken English.
- subtitleEn must be natural on-screen English.
- Do not invent unsupported historical facts.

Also create this top-level field:

titleEn

titleEn must be a natural clickable English Shorts title
for the same historical topic.

Do not remove or rename any existing Korean fields.

`;

const TYPE_JUDGE_PROMPT = `

너는 History YouTube Shorts의 Director다.

Manager가 전달한 키워드를 그대로 제목으로 사용하지 않는다.

키워드의 의미를 이해하고,
그 안에서 만들 수 있는 콘텐츠를 스스로 생각한다.

최근 7일 콘텐츠 목록과 비교하여
문자열이 아니라 의미와 핵심 내용이 같은지를 판단한다.

같은 내용을 다른 제목이나 표현으로 바꾼 주제는 중복으로 판단한다.

중복이 아니면서 현재 Shorts로 만들 가치가 가장 높은
구체적인 주제를 스스로 선택한다.

GLOBAL과 RANKING 중 어떤 형식이 주제에 더 적합한지도
Director가 스스로 판단한다.

GLOBAL은 하나의 주제나 사건을 중심으로 전개할 수 있다.

RANKING은 여러 대상을 비교하는 것이 실제 콘텐츠에 더 적합할 때 선택한다.

형식과 주제의 구체적인 내용은
키워드와 중복 목록을 이해한 뒤 스스로 결정한다.

JSON만 출력한다.

{
  "format": "global",
  "completedTopic": "",
  "reason": ""
}

format은 반드시 global 또는 ranking 중 하나다.

`;


/*
=====================================================
GLOBAL PROMPT
=====================================================
*/

const GLOBAL_PROMPT = `

선정된 History 주제를 하나의 Shorts 영상으로 제작한다.

영상 전체 시간과 주제의 정보량을 고려하여
필요한 Scene 수와 흐름을 스스로 결정한다.

어떤 방식으로 시작하고,
어떤 순서로 정보를 전달하며,
어떤 장면에서 핵심 내용을 보여주고,
어떻게 마무리할지는 주제에 맞게 스스로 판단한다.

모든 Scene에는 실제 영상 제작에 필요한 필수 필드를 작성한다.

imageQueries는 해당 Scene을 실제 이미지 또는 영상 검색으로
확보할 수 있는 구체적인 영어 검색어로 작성한다.

같은 의미의 검색어를 반복하지 않는다.

역사적 사실과 시대적 맥락을 정확하게 유지한다.

25~40초 범위에서 주제에 맞는 적절한 영상 흐름을 만든다.

JSON 외에는 출력하지 않는다.

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

선정된 History 주제를 Ranking Shorts로 제작한다.

몇 개의 항목이 주제에 가장 적합한지는
콘텐츠의 의미와 영상 길이를 고려하여 Director가 판단한다.

항목의 순서,
각 항목에서 전달할 핵심 내용,
Hook,
전체 흐름,
Ending은
주제에 맞게 스스로 결정한다.

단순한 정보 나열이 아니라
각 항목이 전체 영상에서 의미를 갖도록 구성한다.

imageQueries는 각 Scene의 핵심 내용을 실제 이미지 또는 영상으로
찾을 수 있는 구체적인 영어 검색어로 작성한다.

같은 의미의 검색어를 반복하지 않는다.

역사적 사실과 시대적 맥락을 정확하게 유지한다.

35~40초 범위에서 주제에 맞는 적절한 영상 흐름을 만든다.

JSON 외에는 출력하지 않는다.

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

    /*
    coreSubject 전체 문구를
    검색어에 그대로 넣을 필요는 없다.

    핵심 단어가 하나라도 검색어에 있으면
    Director 검색어 검증을 통과시킨다.

    실제 이미지가 coreSubject에 맞는지는
    Reviewer가 검증한다.
    */

    return matched >= 1;

}


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

${ENGLISH_VERSION_PROMPT}

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

특히 모든 Scene에는 반드시
coreSubject를 포함한다.

모든 imageQueries에는
해당 Scene의 coreSubject가 반드시 포함되어야 한다.

coreSubject가 없거나
imageQueries가 비어 있는 Scene을 만들지 않는다.

조건을 만족하지 못하는 Scene은
임의로 수정하지 않고 실패 가능한 결과로 만든다.

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



/*
=====================================================
DIRECTOR SCENE SAFETY
=====================================================

Scene이 실제 영상 제작에 필요한 시각자료를
확보할 수 없는 경우 Director 자체를 실패 처리한다.

절대로 임의의 Scene이나 imageQuery를
만들어서 살리지 않는다.
=====================================================
*/

function validateHistorySceneSafety(
    scenes
){
    if(
        !Array.isArray(scenes) ||
        scenes.length === 0
    ){
        console.error(
            "[HISTORY DIRECTOR] FAILED : NO SCENES"
        );

        throw new Error(
            "HISTORY DIRECTOR 결과에 Scene이 없습니다."
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
        CORE SUBJECT
        =================================================

        coreSubject는 선택 필드다.

        명확한 역사적 대표 대상이 있는 경우에는
        해당 대상을 우선 보호한다.

        대표 대상이 없는 Scene에서는
        빈 문자열을 허용한다.

        coreSubject가 없다고 해서
        Scene을 실패 처리하지 않는다.
        */

        const coreSubject =
            String(
                scene?.coreSubject || ""
            ).trim();

        scene.coreSubject =
            coreSubject;

        /*
        =================================================
        IMAGE QUERIES
        =================================================
        */

        if(
            !Array.isArray(
                scene?.imageQueries
            ) ||
            scene.imageQueries.length === 0
        ){
            console.error(
                `[HISTORY DIRECTOR] FAILED : SCENE ${sceneNumber} HAS EMPTY IMAGE QUERY`
            );

            throw new Error(
                `HISTORY_DIRECTOR_SCENE_${sceneNumber}_NO_IMAGE_QUERY`
            );
        }

        const queries =
            scene.imageQueries
                .map(
                    query =>
                        String(
                            query || ""
                        ).trim()
                )
                .filter(Boolean);

        if(
            queries.length === 0
        ){
            console.error(
                `[HISTORY DIRECTOR] FAILED : SCENE ${sceneNumber} HAS EMPTY IMAGE QUERY`
            );

            throw new Error(
                `HISTORY_DIRECTOR_SCENE_${sceneNumber}_EMPTY_IMAGE_QUERY`
            );
        }
    }

    console.log(
        `[HISTORY DIRECTOR] SCENE SAFETY PASS : ${scenes.length} SCENES`
    );

    return true;
}


    validateHistorySceneSafety(
        director.scenes
    );

    return director;

}
