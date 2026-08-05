import { getTopicPlan, saveSubject } from "./topicManager.js";
import { analyzeScene } from "./sceneEngine.js";
import { getPrompt } from "./promptManager.js";
import { buildKeywords } from "./keywordEngine.js";
import { createImages } from "./imageEngine.js";
import { buildSearchPlan } from "../core/searchPlanner.js";
import {
    debug
} from "../logger.js";

export async function buildEngine(
    ai,
    API_KEY,
    model
){

    const topicPlan = await getTopicPlan(ai.title);

const result = {

    title: ai.title,

    videoType: ai.videoType,

    globalSubject: ai.globalSubject,

    hook: ai.hook,

    ending: ai.ending,

    scenes: []

};

let sceneIndex = 1;

for(const scene of ai.scenes){

let plan = await analyzeScene(scene);

plan.sceneType =
    scene.sceneType ||
    plan.sceneType;

plan.subject =
    scene.sceneSubject ||
    scene.subject ||
    plan.subject;

plan.category =
    scene.category || "";

plan.action =
    scene.action || "";

plan.focus =
    scene.focus || "";

plan.searchName =
    scene.searchName || "";

plan.searchSubject =
    scene.searchSubject ||
    scene.searchName ||
    plan.subject;

plan.imageQueries =
    Array.isArray(scene.imageQueries)
        ? scene.imageQueries
        : (
            Array.isArray(scene.images)
                ? scene.images
                : []
        );

plan.imagePrompt =
    scene.imagePrompt ||
    "";

plan.imageKeywords =
    Array.isArray(scene.imageKeywords)
        ? scene.imageKeywords
        : [];

plan.imageLimit =
    scene.imageLimit ||
    (
        plan.sceneType==="ranking"
            ? 3
            : 1
    );


if(
    !plan.searchName ||
    !Array.isArray(plan.imageQueries) ||
    plan.imageQueries.length===0
){

if(
    plan.searchName &&
    Array.isArray(plan.imageQueries) &&
    plan.imageQueries.length
){

debug({
    search: plan.searchName,
    images: plan.imageQueries
});
}
    plan = await buildSearchPlan(
        {
            title:ai.title,
            globalSubject:
                ai.globalSubject,
            videoType:
                ai.videoType
        },
        plan,
        API_KEY,
        model
    );

}

if(

    topicPlan.excluded.includes(

        plan.subject

    )

){

debug(
    "중복 제외 :",
    plan.subject
);

    continue;

}

const keywords = buildKeywords(plan);

if(
    (!plan.searchName || plan.searchName==="") &&
    Array.isArray(plan.imageQueries) &&
    plan.imageQueries.length
){

    plan.searchName = plan.imageQueries[0];

}

if(
    (!plan.searchSubject || plan.searchSubject==="") &&
    plan.searchName
){

    plan.searchSubject = plan.searchName;

}
debug({
    subject: plan.subject,
    search: plan.searchName,
    images: plan.imageQueries
});

plan.globalSubject =
    ai.globalSubject;

plan.videoType =
    ai.videoType;

const prompt = getPrompt(plan);

if(!keywords.length){

debug(
    "키워드 생성 실패 :",
    plan.subject
);

    continue;

}


result.scenes.push({
    sceneNo:sceneIndex,
    sceneType:plan.sceneType,
    title:scene.title,
    voice:scene.voice,
    subtitle:scene.subtitle,

    subject:plan.subject,
    searchSubject:plan.searchSubject,
    searchHint:plan.searchHint,

imagePrompt:plan.imagePrompt,

imageKeywords:plan.imageKeywords,

searchName:plan.searchName,

imageQueries:
    Array.isArray(plan.imageQueries)
        ? plan.imageQueries
        : [],

imageLimit:
    plan.imageLimit,

category:plan.category,
    action:plan.action,
    focus:plan.focus,
    location:plan.location,
    camera:plan.camera,

    confidence:plan.confidence,

    plan,
    prompt,
    keywords
});

if(plan.subject){

    await saveSubject(

        ai.title,

        plan.subject

    );

}
sceneIndex++;
    }

    return await createImages(result);

}
