import axios from "axios";

import {
    searchPexels
} from "../providers/pexelsProvider.js";

import {
    searchPixabay
} from "../providers/pixabayProvider.js";

import {
    searchPexelsVideo
} from "../providers/pexelsVideoProvider.js";

import {
    searchPixabayVideo
} from "../providers/pixabayVideoProvider.js";

import {
    getVisualSearchModels,
    removeModel
} from "../ai/modelLoader.js";


const OPENROUTER_URL =
    "https://openrouter.ai/api/v1/chat/completions";


function getApiKey(){

    const key =
        process.env.OPENROUTER_API_KEY;

    if(!key){

        throw new Error(
            "OPENROUTER_API_KEY 없음"
        );

    }

    return key;

}


function cleanText(
    value = ""
){

    return String(
        value || ""
    )
        .replace(/\s+/g," ")
        .trim();

}


function normalizeCandidate(
    candidate,
    type
){

    if(!candidate?.url){

        return null;

    }

    return {

        type,

        provider:
            candidate.provider || "",

        url:
            candidate.url,

        width:
            Number(
                candidate.width || 0
            ),

        height:
            Number(
                candidate.height || 0
            ),

        duration:
            Number(
                candidate.duration || 0
            ),

        tags:
            cleanText(
                candidate.tags
            ),

        score:
            Number(
                candidate.score || 0
            )

    };

}


function uniqueCandidates(
    candidates
){

    const seen =
        new Set();

    const result =
        [];

    for(
        const candidate of candidates
    ){

        if(!candidate?.url){

            continue;

        }

        if(
            seen.has(
                candidate.url
            )
        ){

            continue;

        }

        seen.add(
            candidate.url
        );

        result.push(
            candidate
        );

    }

    return result;

}


function limitCandidates(
    candidates,
    limit = 12
){

    return uniqueCandidates(
        candidates
            .filter(Boolean)
    ).slice(
        0,
        limit
    );

}


/*
=========================================================
SEARCH TOOLS
=========================================================
*/


async function searchImageProvider(
    provider,
    query
){

    try{

        let result = [];

        if(
            provider === "Pexels"
        ){

            result =
                await searchPexels(
                    query
                );

        }

        else if(
            provider === "Pixabay"
        ){

            result =
                await searchPixabay(
                    query
                );

        }

        if(
            !Array.isArray(result)
        ){

            return [];

        }

        return limitCandidates(
            result.map(
                candidate =>
                    normalizeCandidate(
                        candidate,
                        "image"
                    )
            )
        );

    }
    catch(error){

        console.log(
            `[VISUAL TOOL FAIL] ${provider} IMAGE`,
            error?.message || error
        );

        return [];

    }

}


async function searchVideoProvider(
    provider,
    query
){

    try{

        let result = [];

        if(
            provider === "Pexels"
        ){

            result =
                await searchPexelsVideo(
                    query
                );

        }

        else if(
            provider === "Pixabay"
        ){

            result =
                await searchPixabayVideo(
                    query
                );

        }

        if(
            !Array.isArray(result)
        ){

            return [];

        }

        return limitCandidates(
            result.map(
                candidate =>
                    normalizeCandidate(
                        candidate,
                        "video"
                    )
            )
        );

    }
    catch(error){

        console.log(
            `[VISUAL TOOL FAIL] ${provider} VIDEO`,
            error?.message || error
        );

        return [];

    }

}


async function runSearchTool(
    toolName,
    query
){

    const cleanQuery =
        cleanText(
            query
        );

    if(!cleanQuery){

        return [];

    }

    console.log(
        `[VISUAL AGENT TOOL] ${toolName} : ${cleanQuery}`
    );


    if(
        toolName ===
        "search_pexels_image"
    ){

        return searchImageProvider(
            "Pexels",
            cleanQuery
        );

    }


    if(
        toolName ===
        "search_pixabay_image"
    ){

        return searchImageProvider(
            "Pixabay",
            cleanQuery
        );

    }


    if(
        toolName ===
        "search_pexels_video"
    ){

        return searchVideoProvider(
            "Pexels",
            cleanQuery
        );

    }


    if(
        toolName ===
        "search_pixabay_video"
    ){

        return searchVideoProvider(
            "Pixabay",
            cleanQuery
        );

    }


    return [];

}


/*
=========================================================
TOOLS
=========================================================
*/


const TOOLS = [

    {

        type:
            "function",

        function: {

            name:
                "search_pexels_image",

            description:
                "Search Pexels for real photographs. Use your own visual reasoning to decide what should be searched. Do not simply copy the Scene text.",

            parameters: {

                type:
                    "object",

                properties: {

                    query: {

                        type:
                            "string",

                        description:
                            "Short English visual query describing what should actually appear in the photograph."

                    }

                },

                required: [
                    "query"
                ]

            }

        }

    },


    {

        type:
            "function",

        function: {

            name:
                "search_pixabay_image",

            description:
                "Search Pixabay for real photographs. Use this when it can provide a useful visual representation of the Scene.",

            parameters: {

                type:
                    "object",

                properties: {

                    query: {

                        type:
                            "string",

                        description:
                            "Short English visual query describing the desired photograph."

                    }

                },

                required: [
                    "query"
                ]

            }

        }

    },


    {

        type:
            "function",

        function: {

            name:
                "search_pexels_video",

            description:
                "Search Pexels for real video footage. Use this when actual motion or action is important to the Scene.",

            parameters: {

                type:
                    "object",

                properties: {

                    query: {

                        type:
                            "string",

                        description:
                            "Short English query describing the actual footage needed."

                    }

                },

                required: [
                    "query"
                ]

            }

        }

    },


    {

        type:
            "function",

        function: {

            name:
                "search_pixabay_video",

            description:
                "Search Pixabay for real video footage. Use this when suitable footage may exist there.",

            parameters: {

                type:
                    "object",

                properties: {

                    query: {

                        type:
                            "string",

                        description:
                            "Short English query describing the desired footage."

                    }

                },

                required: [
                    "query"
                ]

            }

        }

    }

];

const VIDEO_TOOLS = TOOLS.filter(
    tool =>
        tool?.function?.name?.includes("_video")
);

const IMAGE_TOOLS = TOOLS.filter(
    tool =>
        tool?.function?.name?.includes("_image")
);

/*
=========================================================
AGENT SYSTEM PROMPT
=========================================================
*/

function buildSystemPrompt(){

    return `
너는 ShortsAI의 Visual Search Agent다.

너의 임무는 Scene을 실제 이미지 또는 실제 영상으로 표현할 수 있는 가장 적합한 자료를 찾는 것이다.

절대로 Scene 문장 전체를 그대로 검색어로 사용하지 않는다.
먼저 Scene에서 "화면에서 가장 중요하게 보여야 하는 것"을 판단한다.

=========================================================
1. 가장 중요한 판단: VISUAL TARGET
=========================================================

Scene을 읽고 먼저 다음 중 하나를 결정한다.

A. SUBJECT-CENTERED SCENE
B. PLACE / BACKGROUND-CENTERED SCENE
C. ATMOSPHERE-CENTERED SCENE

핵심은 coreSubject라는 필드의 존재 여부가 아니다.

coreSubject가 있더라도 Scene 전체 의미를 보고
그 대상이 실제 화면의 주인공인지 판단해야 한다.

예:

Scene:
피그미다람쥐가 편의점에서 라면을 먹는다.

VISUAL TARGET:
피그미다람쥐

검색:
pigmy squirrel eating ramen
또는
pigmy squirrel eating food

이 경우 일반적인 squirrel, 숲, 편의점만 검색해서는 안 된다.

---------------------------------------------------------

다른 예:

Scene:
조선시대 양반들이 몰래 드나들던 주막

이 경우 VISUAL TARGET은 반드시 양반이라고 단정하지 않는다.

이 Scene에서 가장 중요한 화면은
"조선시대의 전통 주막"이라는 공간과 분위기다.

따라서 우선 검색 방향은:

Joseon Korean tavern
traditional Korean tavern night
Joseon era tavern
traditional Korean tavern hanok

등이 될 수 있다.

양반은 장면의 보조 요소일 수 있다.

---------------------------------------------------------

즉:

"coreSubject가 존재한다"
=
무조건 coreSubject만 검색한다.

가 아니다.

반드시 Scene 전체를 보고
무엇이 화면의 중심이어야 하는지 판단한다.

=========================================================
2. VISUAL TARGET 우선순위
=========================================================

다음 순서로 판단한다.

1. Scene에서 명확한 핵심 인물/동물/사물이 실제 화면의 주체인 경우
   → SUBJECT

2. 특정 장소나 공간 자체가 Scene의 핵심인 경우
   → PLACE / BACKGROUND

3. 특정 주체나 장소보다 분위기 자체가 핵심인 경우
   → ATMOSPHERE

핵심 대상이 명확하면 그것을 검색해야 한다.

하지만 Scene의 의미상 장소가 핵심이면
사람을 억지로 주체로 만들지 않는다.

=========================================================
3. coreSubject 사용 규칙
=========================================================

coreSubject는 매우 중요한 참고 정보다.

하지만 coreSubject를 검색어에 무조건 넣지 않는다.

다음 질문을 먼저 판단한다.

"이 Scene을 실제 영상으로 만들었을 때
시청자가 가장 먼저 봐야 하는 것은 무엇인가?"

그 답이 coreSubject라면 coreSubject 중심으로 검색한다.

그 답이 장소라면 장소 중심으로 검색한다.

그 답이 분위기라면 분위기 중심으로 검색한다.

=========================================================
4. VIDEO / IMAGE 우선순위
=========================================================

Scene에 행동, 이동 또는 실제 움직임이 핵심이면
반드시 VIDEO를 먼저 검색한다.

예:

걷는다
들어간다
나온다
달린다
먹는다
요리한다
작업한다
운반한다
싸운다
문을 연다
무언가를 집는다

이런 경우:

VIDEO SEARCH
↓
후보 판단
↓
적합한 VIDEO가 있음
→ VIDEO 선택

적합한 VIDEO가 없음
→ IMAGE SEARCH

중요:

VIDEO라는 이유만으로 아무 VIDEO나 선택하지 않는다.

핵심 시각 대상과 전혀 관계없는 VIDEO는 실패다.

---------------------------------------------------------

정적인 Scene은 IMAGE를 우선 검색한다.

=========================================================
5. SEARCH FALLBACK
=========================================================

검색은 다음 단계로 내려간다.

LEVEL 1:
핵심 VISUAL TARGET

LEVEL 2:
핵심 대상 + 시대 / 문화 / 장소 / 분위기

LEVEL 3:
핵심 대상이 포함된 장소 또는 환경

LEVEL 4:
문화적 / 시대적 배경

LEVEL 5:
전체 분위기

예:

피그미다람쥐가 라면을 먹는다.

LEVEL 1:
pigmy squirrel eating

LEVEL 2:
pigmy squirrel eating food

LEVEL 3:
pigmy squirrel close up

그 후에도 적합한 결과가 없으면
배경이나 분위기로 내려갈 수 있다.

하지만 피그미다람쥐가 핵심인 Scene에서
일반적인 숲 사진을 성공으로 처리하면 안 된다.

---------------------------------------------------------

조선시대 주막 Scene:

LEVEL 1:
Joseon Korean tavern

LEVEL 2:
traditional Korean tavern night

LEVEL 3:
Joseon hanok tavern

LEVEL 4:
traditional Korean village night

LEVEL 5:
traditional Korean night atmosphere

이런 식으로 점진적으로 완화한다.

=========================================================
6. CULTURAL / HISTORICAL IDENTITY
=========================================================

Scene에 명확한 문화권이나 시대가 있으면 반드시 유지한다.

예:

조선시대 한국
→ Korean / Joseon / traditional Korean

한국 전통 주막
→ Korean traditional tavern / hanok / Korean folk village

절대로 다음으로 대체하지 않는다.

중국
일본
베트남
유럽
서양 중세
현대 서울

단순히 "아시아"라는 이유로 허용하지 않는다.

특히 역사 Scene에서
현대 서울 야경을 조선시대 Scene의 대체재로 선택하면 안 된다.

=========================================================
7. 후보 선택
=========================================================

검색 결과의 score를 신뢰해서 자동 선택하지 않는다.

반드시 다음을 판단한다.

- 핵심 시각 대상
- 시대
- 문화
- 장소
- 행동
- 분위기
- 실제 화면 내용

핵심 대상과 완전히 다른 후보는 탈락시킨다.

예:

Scene:
조선시대 전통 주막

후보:
현대 서울 거리

→ REJECT

후보:
베트남 전통 가옥

→ REJECT

후보:
일본 전통 거리

→ REJECT

후보:
한국 전통 한옥 / 민속마을 / 전통 음식점

→ 부분적으로 적합할 수 있음

후보:
조선시대 또는 한국 전통 주막

→ 가장 높은 우선순위

=========================================================
8. VIDEO 후보 판단
=========================================================

VIDEO 후보의 tags가 비어 있어도
score만 보고 선택하지 않는다.

VIDEO의 검색어와 반환된 metadata를 종합해
Scene과 충분히 관련 있는지 판단한다.

특히 행동 Scene에서는
"움직이는 영상"이라는 사실만으로 성공시키지 않는다.

핵심 대상 또는 핵심 장소와 관계없는 VIDEO는
NO_SUITABLE_CANDIDATE로 처리한다.

=========================================================
9. IMAGE 후보 판단
=========================================================

IMAGE 후보가 제공되면 가능한 경우
실제 이미지를 직접 보고 판단한다.

tags에 단어가 들어있다는 이유만으로 선택하지 않는다.

실제 이미지가 Scene의 핵심 시각 요소와 맞아야 한다.

=========================================================
10. 검색 반복
=========================================================

처음 검색 결과가 부족하면 검색어를 바꾼다.

같은 검색을 반복하지 않는다.

가능한 경우:

1. Pexels Video
2. Pixabay Video
3. 다른 Video 검색어
4. Pexels Image
5. Pixabay Image
6. 배경 / 분위기 검색

단, Scene이 정적인 경우에는 Image를 먼저 사용할 수 있다.

=========================================================
11. 핵심 원칙
=========================================================

무조건 coreSubject를 검색하지 않는다.

무조건 background를 검색하지 않는다.

무조건 VIDEO를 선택하지 않는다.

무조건 score가 높은 후보를 선택하지 않는다.

무조건 검색 결과가 하나라도 있으면 성공시키지 않는다.

항상:

"이 후보를 실제 영상의 한 장면으로 사용했을 때
Scene의 핵심을 시청자가 이해할 수 있는가?"

를 기준으로 판단한다.

=========================================================
12. NO SUITABLE
=========================================================

핵심 시각 대상과 맞는 후보가 없고
배경으로 완화해도 Scene의 문화적 / 시대적 정체성을 유지할 수 없다면
억지로 선택하지 않는다.

반드시:

{
    "selectedUrl":"",
    "selectedType":"",
    "reason":"NO_SUITABLE_CANDIDATE",
    "confidence":0
}

을 반환한다.

=========================================================
13. URL
=========================================================

절대로 URL을 만들지 않는다.

절대로 URL을 수정하지 않는다.

절대로 URL을 추측하지 않는다.

selectedUrl은 반드시 실제 Search Tool이 반환한 후보 URL이어야 한다.

=========================================================
FINAL OUTPUT
=========================================================

모든 검색과 판단이 끝나면 반드시 JSON만 출력한다.

{
    "selectedUrl":"",
    "selectedType":"",
    "reason":"",
    "confidence":0
}
`;
}

/*
=========================================================

=========================================================
*/


function parseFinalResult(
    text
){

    if(!text){

        return null;

    }

    const cleaned =
        String(
            text
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


    const start =
        cleaned.indexOf(
            "{"
        );

    const end =
        cleaned.lastIndexOf(
            "}"
        );


    if(
        start === -1 ||
        end === -1
    ){

        return null;

    }


    try{

        return JSON.parse(
            cleaned.substring(
                start,
                end + 1
            )
        );

    }
    catch{

        return null;

    }

}


/*
=========================================================
IMAGE VISION MESSAGE
=========================================================
*/


function buildVisualCandidateMessage(
    candidates
){

    const imageCandidates =
        candidates.filter(
            candidate =>
                candidate.type ===
                "image"
        );


    if(
        imageCandidates.length === 0
    ){

        return null;

    }


    const content = [

        {

            type:
                "text",

            text:
                `
These are real image candidates returned by the search tools.

Inspect the actual images and determine which one best
represents the Scene.

Do not judge only from the filenames or tags.

Candidate URLs are authoritative identifiers.

Choose only from these candidates.
                `

        }

    ];


    for(
        const candidate of imageCandidates
    ){

        content.push({

            type:
                "text",

            text:
                `CANDIDATE URL:
${candidate.url}

Provider:
${candidate.provider}

Tags:
${candidate.tags}

Resolution:
${candidate.width}x${candidate.height}
`

        });


        content.push({

            type:
                "image_url",

            image_url: {

                url:
                    candidate.url

            }

        });

    }


    return {

        role:
            "user",

        content

    };

}


/*
=========================================================
AGENT
=========================================================
*/

async function callVisualSearchAgent(
    scene
){

    const apiKey =
        getApiKey();

    const models =
        await getVisualSearchModels();

    let lastError =
        null;

    for(
        const model of models
    ){

        try{

            console.log(
                `[VISUAL SEARCH AGENT] MODEL : ${model}`
            );

            /*
            =================================================
            STAGE 1
            VIDEO FIRST
            =================================================
            */

            const videoMessages = [

                {
                    role:
                        "system",

                    content:
                        buildSystemPrompt()
                },

                {
                    role:
                        "user",

                    content:
                        `
SCENE:

${JSON.stringify(
    scene,
    null,
    2
)}

IMPORTANT:

VIDEO SEARCH STAGE.

You are currently in the VIDEO-ONLY search stage.

You MUST search for video first.

You can ONLY use these tools:

- search_pexels_video
- search_pixabay_video

Do NOT search for images.

Search for the best real video representation of the Scene.

If a suitable video exists, select it.

If the available videos are clearly unsuitable,
return:

{
    "selectedUrl":"",
    "selectedType":"",
    "reason":"NO_SUITABLE_VIDEO",
    "confidence":0
}

Do not select an image in this stage.

Begin video search.
`
                }

            ];

            const videoCandidates = [];

            let videoFinal = null;

            for(
                let turn = 0;
                turn < 8;
                turn++
            ){

                const response =
                    await axios.post(

                        OPENROUTER_URL,

                        {

                            model,

                            messages:
                                videoMessages,

                            tools:
                                VIDEO_TOOLS,

                            tool_choice:
                                "auto",

                            temperature:
                                0

                        },

                        {

                            headers: {

                                Authorization:
                                    `Bearer ${apiKey}`,

                                "Content-Type":
                                    "application/json",

                                "HTTP-Referer":
                                    "https://github.com",

                                "X-Title":
                                    "ShortsAI Visual Search Agent"

                            },

                            timeout:
                                60000

                        }

                    );

                const message =
                    response
                        ?.data
                        ?.choices?.[0]
                        ?.message;

                if(!message){

                    throw new Error(
                        "Visual Agent 응답 없음"
                    );

                }

                videoMessages.push(
                    message
                );

                const toolCalls =
                    Array.isArray(
                        message.tool_calls
                    )
                        ? message.tool_calls
                        : [];

                /*
                =========================================
                VIDEO TOOL CALL
                =========================================
                */

                if(
                    toolCalls.length > 0
                ){

                    for(
                        const toolCall of toolCalls
                    ){

                        const functionName =
                            toolCall
                                ?.function
                                ?.name;

                        let args = {};

                        try{

                            args =
                                JSON.parse(
                                    toolCall
                                        ?.function
                                        ?.arguments ||
                                    "{}"
                                );

                        }
                        catch{

                            args = {};

                        }

                        const query =
                            cleanText(
                                args.query
                            );

                        const toolResult =
                            await runSearchTool(
                                functionName,
                                query
                            );

                        videoCandidates.push(
                            ...toolResult
                        );

                        videoMessages.push({

                            role:
                                "tool",

                            tool_call_id:
                                toolCall.id,

                            content:
                                JSON.stringify(
                                    toolResult,
                                    null,
                                    2
                                )

                        });

                    }

                    continue;

                }

                /*
                =========================================
                VIDEO FINAL RESULT
                =========================================
                */

                videoFinal =
                    parseFinalResult(
                        message.content
                    );

                if(
                    !videoFinal
                ){

                    videoMessages.push({

                        role:
                            "user",

                        content:
                            `
Review the video candidates.

You are still in VIDEO-ONLY stage.

If a suitable video exists,
select one exact candidate URL.

If no suitable video exists,
return:

{
    "selectedUrl":"",
    "selectedType":"",
    "reason":"NO_SUITABLE_VIDEO",
    "confidence":0
}

Do not select an image.

Return ONLY JSON.
`
                    });

                    continue;

                }

                break;

            }

            const uniqueVideos =
                uniqueCandidates(
                    videoCandidates
                );

            let selectedVideo =
                null;

            const selectedVideoUrl =
                cleanText(
                    videoFinal?.selectedUrl
                );

            if(
                selectedVideoUrl
            ){

                selectedVideo =
                    uniqueVideos.find(
                        candidate =>
                            candidate.url ===
                            selectedVideoUrl &&
                            candidate.type ===
                            "video"
                    ) || null;

            }

            /*
            =================================================
            VIDEO SUCCESS
            =================================================
            */

            if(
                selectedVideo
            ){

                console.log(
                    "[VISUAL SEARCH AGENT VIDEO SELECTED]",
                    selectedVideo.url
                );

                return {

                    selected:
                        selectedVideo,

                    candidates:
                        uniqueVideos

                };

            }

            /*
            =================================================
            STAGE 2
            IMAGE FALLBACK
            =================================================
            */

            console.log(
                "[VISUAL SEARCH AGENT] NO SUITABLE VIDEO"
            );

            const imageMessages = [

                {
                    role:
                        "system",

                    content:
                        buildSystemPrompt()
                },

                {
                    role:
                        "user",

                    content:
                        `
SCENE:

${JSON.stringify(
    scene,
    null,
    2
)}

VIDEO SEARCH RESULT:

No suitable video was selected.

You are now entering the IMAGE FALLBACK stage.

You can ONLY use these tools:

- search_pexels_image
- search_pixabay_image

Do NOT search for video.

Find the best real photograph that represents the Scene.

The selected URL MUST come exactly from an image search result.

Begin image search.
`
                }

            ];

            const imageCandidates = [];

            let imageFinal =
                null;

            for(
                let turn = 0;
                turn < 8;
                turn++
            ){

                const response =
                    await axios.post(

                        OPENROUTER_URL,

                        {

                            model,

                            messages:
                                imageMessages,

                            tools:
                                IMAGE_TOOLS,

                            tool_choice:
                                "auto",

                            temperature:
                                0

                        },

                        {

                            headers: {

                                Authorization:
                                    `Bearer ${apiKey}`,

                                "Content-Type":
                                    "application/json",

                                "HTTP-Referer":
                                    "https://github.com",

                                "X-Title":
                                    "ShortsAI Visual Search Agent"

                            },

                            timeout:
                                60000

                        }

                    );

                const message =
                    response
                        ?.data
                        ?.choices?.[0]
                        ?.message;

                if(!message){

                    throw new Error(
                        "Visual Agent 응답 없음"
                    );

                }

                imageMessages.push(
                    message
                );

                const toolCalls =
                    Array.isArray(
                        message.tool_calls
                    )
                        ? message.tool_calls
                        : [];

                /*
                =========================================
                IMAGE TOOL CALL
                =========================================
                */

                if(
                    toolCalls.length > 0
                ){

                    for(
                        const toolCall of toolCalls
                    ){

                        const functionName =
                            toolCall
                                ?.function
                                ?.name;

                        let args = {};

                        try{

                            args =
                                JSON.parse(
                                    toolCall
                                        ?.function
                                        ?.arguments ||
                                    "{}"
                                );

                        }
                        catch{

                            args = {};

                        }

                        const query =
                            cleanText(
                                args.query
                            );

                        const toolResult =
                            await runSearchTool(
                                functionName,
                                query
                            );

                        imageCandidates.push(
                            ...toolResult
                        );

                        imageMessages.push({

                            role:
                                "tool",

                            tool_call_id:
                                toolCall.id,

                            content:
                                JSON.stringify(
                                    toolResult,
                                    null,
                                    2
                                )

                        });

                        /*
                        =================================
                        GIVE ACTUAL IMAGES TO AGENT
                        =================================
                        */

                        const visualMessage =
                            buildVisualCandidateMessage(
                                uniqueCandidates(
                                    imageCandidates
                                ).slice(
                                    -12
                                )
                            );

                        if(
                            visualMessage
                        ){

                            imageMessages.push(
                                visualMessage
                            );

                        }

                    }

                    continue;

                }

                /*
                =========================================
                IMAGE FINAL RESULT
                =========================================
                */

                imageFinal =
                    parseFinalResult(
                        message.content
                    );

                if(
                    !imageFinal
                ){

                    imageMessages.push({

                        role:
                            "user",

                        content:
                            `
Review the actual image candidates.

Choose the best image candidate.

The selectedUrl MUST exactly match
one of the returned image candidate URLs.

Return ONLY JSON.
`
                    });

                    continue;

                }

                break;

            }

            const uniqueImages =
                uniqueCandidates(
                    imageCandidates
                );

            const selectedImageUrl =
                cleanText(
                    imageFinal?.selectedUrl
                );

            const selectedImage =
                uniqueImages.find(
                    candidate =>
                        candidate.url ===
                        selectedImageUrl &&
                        candidate.type ===
                        "image"
                ) || null;

            /*
            =================================================
            IMAGE SUCCESS
            =================================================
            */

            if(
                selectedImage
            ){

                console.log(
                    "[VISUAL SEARCH AGENT IMAGE SELECTED]",
                    selectedImage.url
                );

                return {

                    selected:
                        selectedImage,

                    candidates:
                        [
                            ...uniqueVideos,
                            ...uniqueImages
                        ]

                };

            }

            /*
            =================================================
            NOTHING FOUND
            =================================================
            */

            console.log(
                "[VISUAL SEARCH AGENT] NO SUITABLE VISUAL"
            );

            return {

                selected:
                    null,

                candidates:
                    [
                        ...uniqueVideos,
                        ...uniqueImages
                    ]

            };

        }
        catch(error){

            lastError =
                error;

            console.log(
                `[VISUAL SEARCH AGENT] FAIL : ${model}`
            );

            console.log(
                "[VISUAL SEARCH AGENT ERROR]",
                error?.response?.status ||
                error?.message ||
                error
            );

            if(
                error?.response?.data
            ){

                console.log(
                    "[OPENROUTER ERROR BODY]",
                    JSON.stringify(
                        error.response.data,
                        null,
                        2
                    )
                );

            }

            try{

                await removeModel(
                    "openrouter",
                    model
                );

            }
            catch{

            }

        }

    }

    throw(
        lastError ||
        new Error(
            "Visual Search Agent 실패"
        )
    );

}


/*
=========================================================
PUBLIC API
=========================================================
*/


export async function searchVisual(
    scene,
    query = ""
){

    const searchScene = {

        ...scene,

        searchHint:
            cleanText(
                query
            )

    };


    console.log(
        "[VISUAL SEARCH AGENT] START"
    );


    const result =
        await callVisualSearchAgent(
            searchScene
        );


    console.log(
        "[VISUAL SEARCH AGENT] SELECTED",
        result?.selected?.url ||
        "NONE"
    );


    return result;

}


export default {

    searchVisual

};
