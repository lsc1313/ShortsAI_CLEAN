import {
    debug
} from "../logger.js";

export function planVideo(topic){

    const text = String(topic || "").toLowerCase();

const blueprint = {

    videoType:"single",

    globalSubject:topic,

    sceneStrategy:"global",

    emotion:"curiosity",

    sceneCount:9,

    imageStrategy:"three_images",

    imagePerScene:3,

    reviewer:true

};

    if(
        text.includes("top") ||
        text.includes("순위") ||
        text.includes("랭킹") ||
        text.includes("best")
    ){

        blueprint.videoType = "ranking";
        blueprint.sceneStrategy = "scene_subject";

    }

    else if(

        text.includes("vs") ||
        text.includes("비교")

    ){

        blueprint.videoType = "comparison";
        blueprint.sceneStrategy = "scene_subject";

    }

    else if(

        text.includes("과정") ||
        text.includes("만드는")

    ){

        blueprint.videoType = "process";
        blueprint.sceneStrategy = "step";

    }

    else if(

        text.includes("역사") ||
        text.includes("진화")

    ){

        blueprint.videoType = "timeline";
        blueprint.sceneStrategy = "timeline";

    }

debug(blueprint);

    return blueprint;

}

