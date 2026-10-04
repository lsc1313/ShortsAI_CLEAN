import { createImage } from "../image.js";
import {
    debug
} from "../logger.js";

export async function createImages(data){

    const script = [];
    const topic = data.title || data.topic || "";

    // Hook
    if(data.hook){

        script.push({

            type:"hook",
            mediaMode: data.mediaMode || "",
            scene:0,
            sceneType:"hook",
            imageLimit:1,

            topic,

title:"Hook",

subject:topic,

searchSubject:topic,

searchHint:
    `${topic} realistic documentary photography`,

imagePrompt:
    `${topic} realistic documentary photography`,

imageKeywords:[
    topic
],

voice:data.hook,

            subtitle:data.hook,

            images:Array.isArray(data.hookImages)
                ? data.hookImages
                :[
                    `${topic} close up`,
                    `${topic} realistic`,
                    `${topic} documentary photography`
                ]

        });

    }

    let sceneNo = 1;

    for(const scene of data.scenes){

        script.push({

            scene:sceneNo++,

            sceneType:
                scene.sceneType || "global",

            mediaMode:
                scene.mediaMode ||
                data.mediaMode ||
                "",

            imageLimit:
                scene.imageLimit ||
                (scene.sceneType==="ranking" ? 3 : 1),

            topic,

            title:scene.title,

            subject:scene.subject || "",

            searchSubject:
                scene.searchSubject || "",

            searchHint:
                scene.searchHint || "",

imagePrompt:
    scene.imagePrompt || "",

imageKeywords:
    scene.imageKeywords || [],

searchName:
    scene.searchName || "",

imageQueries:
    Array.isArray(scene.imageQueries)
        ? scene.imageQueries
        : [],

voice:scene.voice,

            subtitle:scene.subtitle,

            images:Array.isArray(scene.images)
                ? scene.images
                :[]

        });

    }

    data.script = script;

    data.images = await createImage({ scenes: script });

debug("========== IMAGE PLAN ==========");

for(const scene of script){

    debug({
        scene: scene.scene,
        type: scene.sceneType,
        subject: scene.subject,
        images: scene.imageLimit
    });

}

    return data;

}
