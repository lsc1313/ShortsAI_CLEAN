import { callAI } from "../ai/index.js";
import { getRecentDuplicates } from "../services/duplicateService.js";
import { collectHistoryAssets } from "./assetPreflight.js";

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
영상 길이는 내용에 맞춰 25~60초 범위에서 유연하게 결정한다. 짧게 만들기 위해 핵심 설명을 삭제하지 않는다.

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

[역사적 사실 안전 규칙]
- 역사 기록이 없는 인물의 심리, 군중의 행동, 종교 의식, 축제, 대화, 목격 장면을 상상해서 사실처럼 말하지 않는다.
- '모두', '아무도', '도망치지 않았다', '기뻐했다', '축제를 준비했다', '감상했다', '몰라서 멸망했다'처럼 집단 전체의 생각이나 행동을 단정하지 않는다.
- 역사적 사실과 해석·가설을 분리한다. 확인되지 않은 인과관계를 제목이나 결말에 넣지 않는다.
- 언어·문화에 특정 단어가 없었다는 주장은 해당 시대 문헌 근거가 확실하지 않으면 사용하지 않는다.
- 화산 폭발의 지리적 장소를 구분한다. 폼페이와 헤르쿨라네움의 유물·피해를 혼동하지 않는다.
- 확인할 수 없는 극적인 일화 대신 발굴 유물, 동시대 기록, 확인된 사건 순서로 흥미를 만든다.
- 장면별로 검증 가능한 역사적 주장만 쓰고, 검증 근거가 불분명한 주장은 삭제하거나 신중하게 표현한다.
- AI가 만든 검색어 또는 이미지가 사실의 증거가 되지는 않는다.


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

입력 키워드: {{TOPIC}}

최근 7일 콘텐츠 목록:
{{DUPLICATE_TOPICS}}

최근 7일 콘텐츠 목록과 비교하여
문자열이 아니라 의미와 핵심 내용이 같은지를 판단한다.

같은 내용을 다른 제목이나 표현으로 바꾼 주제는 중복으로 판단한다.

중복이 아니면서 현재 Shorts로 만들 가치가 가장 높은
구체적인 주제를 스스로 선택한다.

GLOBAL과 RANKING 중 어떤 형식이 주제에 더 적합한지도
Director가 스스로 판단한다.

GLOBAL은 하나의 주제나 사건을 중심으로 전개할 수 있다.

RANKING은 여러 대상을 동일한 객관적 기준으로 비교할 수 있고 각 항목의 이유를 충분히 설명할 수 있을 때만 선택한다. 그렇지 않으면 GLOBAL을 선택한다.

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

[역사 아카이브 자료 중심 장면 설계]
- coreSubject는 대본에 등장하는 전체 사건의 재현 문장이 아니라, 실제 박물관·위키미디어 아카이브에서 검색 가능한 단일 시각 자료의 대상명으로 지정한다.
- 한 이미지에 서로 다른 대상과 행동과 연도를 합치지 않는다. 예를 들어 "Roman warships sailing towards erupting Mount Vesuvius 79 AD"를 coreSubject로 쓰지 않는다.
- 로마 군함을 보여줄 장면이면 coreSubject="Roman galley" 또는 "Roman bireme"처럼 선박 자체를 지정하고, imageQueries는 "Roman galley illustration", "Roman bireme relief"처럼 실존 자료 유형을 검색한다.
- 베수비오 화산을 보여줄 장면이면 coreSubject="Mount Vesuvius"를 사용하고 imageQueries는 "Mount Vesuvius painting", "Mount Vesuvius eruption historical painting"처럼 작성한다.
- 특정 사건의 실제 기록 사진이 존재하지 않는 경우, 시대를 설명하는 유물·부조·지도·후대 삽화를 사용하되 그것을 사건 당시의 실제 장면이나 직접 증거라고 설명하지 않는다.
- coreSubject에 towards, watching, sailing, erupting 등 동작이나 연출 문구, "79 AD"처럼 장면 설명용 연도를 덧붙이지 않는다. 이런 내용은 direction에만 작성한다.
- 역사적 대상과 무관한 일반 풍경·동전·다른 시대 선박·인물 초상은 검색 대체재로 사용하지 않는다.
- 자료 검색 가능성을 이유로 사실과 대본 내용을 변경하지 않는다.
- CT·X-ray·MRI·DNA 분석·현미경·복원 영상처럼 특정 연구 결과 자체를 요구하는 coreSubject는 공개 아카이브에 실제로 해당 자료가 있을 때만 사용한다.
- 해당 연구 자료의 공개 여부를 확인할 수 없다면 coreSubject를 사건과 직접 관련된 실존 유물·유적·역사 사진으로 지정한다. 예: "Pompeii cast CT scan" 대신 "Pompeii plaster cast"를 사용하고 imageQueries에는 "Pompeii victim plaster cast", "Pompeii cast of human victim"처럼 실제 자료를 찾는 검색어를 넣는다.
- 이 경우 대본에서 CT 연구 사실을 언급할 수는 있지만, direction에서 유물 사진은 CT 촬영 결과가 아니라 관련 유물의 참고 화면임을 분명히 한다. 유물 사진을 CT 영상·내부 구조·검사 결과처럼 연출하거나 자막으로 주장하지 않는다.
- 단, 해당 Scene의 주된 정보가 CT 이미지의 구체적인 판독 결과이고 이를 보여줄 근거 자료가 없다면 다른 검증 가능한 사실 중심으로 Scene을 다시 구성한다. 연구 결과나 사실을 임의로 만들어내지 않는다.


같은 의미의 검색어를 반복하지 않는다.

역사적 사실과 시대적 맥락을 정확하게 유지한다.

25~60초 범위에서 주제에 맞는 적절한 영상 흐름을 만든다. 제목이 제기한 의문에 영상 안에서 구체적으로 답하고, 원인·과정·결과 중 주제에 필요한 설명을 빠뜨리지 않는다. 이름과 연도만 나열하지 않는다.

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
coreSubject는 전체 사건을 묘사하는 문장이 아니라 실제 역사 아카이브에서 찾을 수 있는 유물·인물 초상·지도·회화 등의 단일 시각 대상명으로 작성한다. 연도·행동·감정·연출은 coreSubject에 섞지 않는다.

같은 의미의 검색어를 반복하지 않는다.

역사적 사실과 시대적 맥락을 정확하게 유지한다.

25~60초 범위에서 주제에 맞는 적절한 영상 흐름을 만든다. 각 순위 항목에는 반드시 구체적인 근거 또는 이유를 설명하는 문장을 넣는다. 순위의 비교 기준을 명시하며, 기준이 불분명하면 억지로 순위를 만들지 않고 global 형식을 선택할 수 있도록 주제 선정 단계에서 판단한다. 시간 부족 시 순위 항목 수를 줄여 설명의 완결성을 우선한다.

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


    // Download before writing narration; metadata alone is not a usable asset.
    const archiveQueries = [...new Set([
        String(topic || "").trim(),
        completedTopic,
        ...String(completedTopic).split(/[,，:：]/).map(q => q.trim())
    ])].filter(Boolean);
    const archiveAssets = await collectHistoryAssets(archiveQueries);
    if (archiveAssets.length < 3) {
        throw new Error("[HISTORY ASSET PREFLIGHT] Not enough downloaded archive images (minimum 3).");
    }
    const archiveGuidance = [
        "The following archive assets have ALREADY BEEN DOWNLOADED.",
        "Every scene MUST select exactly one assetId (integer) from this list.",
        "Choose scenes that can truthfully be illustrated by these actual assets.",
        "Do not invent assets or describe an asset as a photo of an event it does not show.",
        "Use at most one scene per assetId. The scene narration must match the selected artifact/site.",
        "Images are not historical fact verification. Do not invent facts.",
        JSON.stringify(archiveAssets.map(({ id, title, provider, sourceUrl, license }) =>
            ({ id, title, provider, sourceUrl, license })))
    ].join("\\n");

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

=====================================================
ARCHIVE PREFLIGHT (VISUAL EVIDENCE ONLY)
=====================================================
${archiveGuidance}


선택된 콘텐츠 형식:

${format}


위 정보를 바탕으로 최종 Shorts Director 결과를 만든다.

중요:

completedTopic을 그대로 반복하는 것이 아니라
실제 영상에서 사용할 수 있도록 대본과 장면을 구성한다.

모든 Scene에는 필수 필드를 빠짐없이 넣는다.\n모든 Scene에는 위 다운로드된 이미지 목록 중 하나의 정수 assetId를 반드시 넣는다. 목록에 없는 assetId를 생성하지 않는다.

출력 JSON의 work_instructions.scenes 배열에 있는 모든 Scene은 imageQueries를
반드시 문자열 2~3개로 구성된 배열로 출력한다. 빈 배열, null, 필드 생략 금지.
imageQueries는 direction이나 imageQuery가 아니라 정확히 imageQueries 필드여야 한다.
예시: "coreSubject": "Pompeii plaster cast", "imageQueries": ["Pompeii victim cast", "Pompeii plaster casts museum"].
이미지 자료를 찾기 어려우면 그 Scene을 실제 검색 가능한 역사 자료 중심으로 다시 설계한다.
검증되지 않은 검색어를 자동 생성해서 오류를 숨기지 않는다.

특히 모든 Scene에는 반드시
coreSubject를 포함한다.

모든 imageQueries는 해당 Scene의 coreSubject가 가리키는 실제 역사 자료를 찾는 영어 검색어로 작성한다. 핵심 대상명 또는 통용되는 동의어를 포함하되 전체 사건을 한 장의 그림으로 요구하지 않는다.

coreSubject가 없거나
imageQueries가 비어 있는 Scene을 만들지 않는다.

각 Scene의 tts에는 시청자가 실제로 얻을 수 있는 사실 또는 명확한 질문과 답을 포함한다. 영상 전체에서 제목이 약속한 정보를 반드시 제공한다. 장면과 무관한 풍경 영상이나 범용 스톡 영상을 imageQueries로 요청하지 않는다.\n\n조건을 만족하지 못하는 Scene은
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


    // Fail closed: do not silently search unrelated images after Director output.
    const selectedIds = new Set();
    const assetById = new Map(archiveAssets.map(asset => [asset.id, asset]));
    const proposedScenes = director?.work_instructions?.scenes ||
        director?.director_analysis?.work_instructions?.scenes || [];
    if (!Array.isArray(proposedScenes) || proposedScenes.length < 3 ||
        proposedScenes.length > archiveAssets.length) {
        throw new Error("[HISTORY ASSET PLAN] Invalid scene count for downloaded assets");
    }
    for (const [index, scene] of proposedScenes.entries()) {
        const id = scene.assetId;
        const asset = assetById.get(id);
        if (!Number.isInteger(id) || !asset || selectedIds.has(id)) {
            throw new Error(`[HISTORY ASSET PLAN] Scene ${index + 1} has missing, duplicate or ungrounded assetId`);
        }
        selectedIds.add(id);
        scene.preflightAsset = {
            file: asset.file, provider: asset.provider, sourceUrl: asset.sourceUrl,
            license: asset.license, title: asset.title
        };
    }

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
