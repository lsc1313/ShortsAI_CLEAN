import { callAI } from "./index.js";
import {
    buildPrompt,
    buildTopicPrompt,
    buildShoppingPrompt
} from "../core/promptBuilder.js";
import { parseJSON } from "./utils.js";

export async function generateScript(

    topic,

    retry = 0,

    options = {}

){

    console.log(

        "[SCRIPT] Prompt 생성"

    );

    const product =
        options?.product || null;


    const prompt =
        product
            ? buildShoppingPrompt(
                topic,
                product
            )
            : buildPrompt(
                topic
            );

    console.log(

        "[SCRIPT] AI 호출"

    );

    const result = await callAI(

        prompt

);

    console.log(

        "[SCRIPT] JSON 파싱"

    );

    const data = parseJSON(

        result
);

const rankingPattern =

    /(탑|top|TOP|Top|순위|랭킹|[0-9]+\s*위)/i;

if(

    rankingPattern.test(topic)

){

    data.videoType = "ranking";

}

if(

    data.videoType === "ranking" &&

    Array.isArray(data.scenes)

){

    data.scenes = data.scenes.map(

        scene => ({

            ...scene,

            sceneType: "ranking",

            imageLimit: 3

        })

    );

}

    data.title ??= topic;

    data.subject ??= topic;

    data.globalSubject ??=

        data.globalSubject ||

        topic;

    data.videoType ??=

        data.videoType ||

        "single";

    data.sceneStrategy ??=

        data.sceneStrategy ||

        "global";

    data.hook ??= "";

    data.ending ??=

        "재미있었다면 구독해주세요.";

    data.hookImages =

        Array.isArray(

            data.hookImages

        )

        ? data.hookImages

        : [

            topic,

            `${topic} realistic`

        ];

    if(

        !Array.isArray(

            data.scenes

        )

    ){

        data.scenes=[];

    }

    data.scenes = data.scenes.map(

        scene=>{

            scene.title ??= "";

            scene.voice ??= "";

            scene.subtitle ??=

                scene.voice;

            scene.sceneType ??=

                "global";

            scene.sceneSubject ??=

                scene.subject ||

                scene.title;

            scene.subject ??=

                scene.sceneSubject;

            scene.searchSubject ??=

                scene.searchSubject ||

                scene.subject;

            scene.searchName ??=

                scene.searchSubject;

            scene.images =

                Array.isArray(

                    scene.images

                )

                ? scene.images

                : [];

            scene.imageQueries =

                scene.images;

            scene.imageKeywords =

                Array.isArray(

                    scene.imageKeywords

                )

                ? scene.imageKeywords

                : [];

            scene.imageLimit ??=

                scene.sceneType==="ranking"

                ?3

                :1;

            scene.imagePrompt ??="";

            scene.focus ??="";

            scene.action ??="";

            scene.plan ??="";

            return scene;

        }

    );

    console.log(

        "[SCRIPT] 완료"

    );

    return data;

}

export async function generateTopics(
    input = 100
){
    console.log(

        "[TOPIC] Prompt 생성"

    );

const prompt = buildTopicPrompt(input);

    console.log(

        "[TOPIC] AI 호출"

    );

    const result=

        await callAI(

            prompt

        );

console.log("===== AI RESULT =====");
console.dir(result, { depth: null });
console.log("===== END =====");

    const data=

        parseJSON(

            result

        );

if (Array.isArray(data)) {
    return data;
}

if (Array.isArray(data.topics)) {
    return data.topics;
}

return [];

}

