import {
    success,
    debug
} from "./logger.js";

export async function createScript(ai){

    const scenes =
        Array.isArray(ai.scenes)
        ? ai.scenes
        : [];

const script=[];

const globalTopic =
    ai.title || "";

    let hookText=(ai.hook||"").trim();

    // Hook 끝 문장 정리
    hookText = hookText
        .replace(/\s+/g," ")
        .replace(/  +/g," ");

if(hookText){

script.push({

    type:"hook",

    topic:globalTopic,

    title:"Hook",

    scene:0,

    subject:globalTopic,

    subtitle:hookText,

    text:hookText,

    voice:hookText,

    images:ai.hookImages || []

});

}


    const used=new Set();

    const normalize=text=>

        String(text||"")

        .replace(/[^\w가-힣]/g,"")

        .toLowerCase();

    used.add(
        normalize(hookText)
    );

    scenes.forEach((scene,index)=>{

        let voice =

            (scene.voice || "")
            .replace(/\s+/g," ")
            .trim();

        // Hook와 유사 문장 제거
        const current = normalize(voice);

        if(
            current &&
            (
                current.includes(normalize(hookText)) ||
                normalize(hookText).includes(current)
            )
        ){

            return;

        }

        // 완전 중복 제거
        if(
            used.has(current)
        ){

            return;

        }

        used.add(current);

// 이미지

let images = [];

if(
    Array.isArray(scene.images) &&
    scene.images.length
){

    images = scene.images
        .map(v => String(v).trim())
        .filter(Boolean)
        .filter((v,i,a)=>a.indexOf(v)===i)
        .slice(0,3);

}

if(images.length===0){

    images = [

        scene.title,

        scene.voice,

        scene.title

    ]
    .map(v=>String(v).trim())
    .filter(Boolean)
    .filter((v,i,a)=>a.indexOf(v)===i)
    .slice(0,3);

}

script.push({

    scene:index+1,

    topic:globalTopic,

    title:scene.title || "",

sceneType:
    scene.sceneType || "global",

searchSubject:
    scene.searchSubject || "",

searchHint:
    scene.searchHint || "",

searchName:
    scene.searchName || "",

imageQueries:
    Array.isArray(scene.imageQueries)
        ? scene.imageQueries
        : [],

imageKeywords:
    Array.isArray(scene.imageKeywords)
        ? scene.imageKeywords
        : [],

imageLimit:
    scene.imageLimit ||
    (
        scene.sceneType === "ranking"
            ? 3
            : 1
    ),

subject:
    scene.subject ||
    scene.topic ||
    scene.keywords?.[0] ||
    scene.images?.[0] ||
    scene.title ||
    globalTopic,

    subtitle:voice,

    text:voice,

    voice:voice,

images:
    Array.isArray(scene.images)
        ? scene.images
        : Array.isArray(scene.imageQueries)
            ? scene.imageQueries
            : [],

imagePrompt:
    scene.imagePrompt ||
    scene.imageQueries?.[0] ||
    scene.images?.[0] ||
    "",

});
});
    /*
    =====================================================
    ENDING CTA
    =====================================================

    AI가 만든 ending을 우선 사용한다.

    단, 구독/좋아요 CTA가 빠져 있으면
    ShortsAI가 자연스러운 CTA를 보강한다.

    결과적으로 모든 쇼츠의 마지막 음성/자막에는
    구독 + 좋아요가 반드시 포함된다.
    =====================================================
    */

    const aiEnding =
        String(ai.ending || "").trim();

    const ctaEndings = [

        "재미있게 보셨다면 좋아요와 구독 부탁드립니다.",

        "더 흥미로운 이야기가 궁금하다면 좋아요와 구독 부탁드립니다.",

        "다음 이야기도 놓치고 싶지 않다면 좋아요와 구독 부탁드립니다.",

        "유익했다면 좋아요와 구독으로 다음 이야기도 함께해주세요."

    ];

    const hasSubscribe =
        /구독/.test(aiEnding);

    const hasLike =
        /좋아요/.test(aiEnding);

    let ending = aiEnding;

    /*
        AI ending이 없거나,
        구독/좋아요 중 하나라도 빠졌으면
        완전한 CTA를 사용한다.

        AI ending이 좋은 문장일 경우에는
        기존 문장을 살리고 CTA를 뒤에 붙인다.
    */

    if (!ending) {

        ending =
            ctaEndings[
                Math.floor(
                    Math.random() *
                    ctaEndings.length
                )
            ];

    }
    else if (
        hasSubscribe &&
        !hasLike
    ) {

        /*
            구독은 이미 있으므로
            좋아요만 자연스럽게 보강한다.
        */
        ending =
            `${ending} 좋아요도 부탁드립니다.`;

    }
    else if (
        !hasSubscribe &&
        hasLike
    ) {

        /*
            좋아요는 이미 있으므로
            구독만 자연스럽게 보강한다.
        */
        ending =
            `${ending} 구독도 부탁드립니다.`;

    }
    else if (
        !hasSubscribe &&
        !hasLike
    ) {

        /*
            둘 다 없으면
            좋아요 + 구독 CTA를 함께 보강한다.
        */
        ending =
            `${ending} 좋아요와 구독 부탁드립니다.`;

    }

    if(ending){

        script.push({

            type:"ending",

            topic:globalTopic,

            title:"Ending",

            subtitle:ending,

            text:ending,

            voice:ending

        });

    }

success(
    "SCRIPT BUILD"
);

debug("===== SCRIPT IMAGE =====");

script.forEach(item=>{

    if(item.images){

debug(
    item.scene,
    item.images
);

    }

});


    return script;

}
