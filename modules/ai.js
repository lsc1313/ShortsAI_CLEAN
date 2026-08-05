import dotenv from "dotenv";

import {
    generateScript
} from "./ai/scriptAI.js";

import {
    debug
} from "./logger.js";

dotenv.config();


/*
=========================================================
CREATOR AI
=========================================================

역할

topic
    ↓
generateScript()
    ↓
AI 대본 결과 반환

Creator 내부에서는

- Engine
- Scene Planner
- Search Planner
- Search AI
- Image Engine
- Topic Manager

를 호출하지 않는다.

이미지 제작은 createShort.js의 IMAGE 단계에서 처리한다.
=========================================================
*/

export async function createAI(

    topic,

    retry = 0,

    options = {}

){

    console.log(
        ">>> createAI()"
    );

    try{

        console.log(
            ">>> generateScript()"
        );


        const data =
            await generateScript(

                topic,

                retry,

                {
                    product:
                        options?.product || null
                }

            );


        /*
        =================================================
        기본 안전 정규화
        =================================================
        */

        data.title =
            String(
                data.title ||
                topic ||
                ""
            ).trim();


        data.globalSubject =
            String(
                data.globalSubject ||
                data.subject ||
                topic ||
                ""
            ).trim();


        data.videoType =
            String(
                data.videoType ||
                "single"
            ).trim();


        data.sceneStrategy =
            String(
                data.sceneStrategy ||
                "global"
            ).trim();


        data.hook =
            String(
                data.hook ||
                ""
            ).trim();


        data.ending =
            String(
                data.ending ||
                ""
            ).trim();


        data.hookImages =
            Array.isArray(
                data.hookImages
            )
                ? data.hookImages
                : [];


        data.scenes =
            Array.isArray(
                data.scenes
            )
                ? data.scenes
                : [];


        /*
        =================================================
        중요

        여기서 buildEngine()을 호출하지 않는다.

        따라서 Creator 내부에서

        buildSearchPlan()
        generateSearch()
        Search Planner Gemini

        가 재호출되지 않는다.
        =================================================
        */


        debug(
            "===== CREATOR AI RESULT ====="
        );


        for(
            const scene of data.scenes
        ){

            debug({

                title:
                    scene.title,

                subject:
                    scene.subject ||
                    scene.sceneSubject,

                search:
                    scene.searchSubject,

                images:
                    scene.imageQueries ||
                    scene.images

            });

        }


        return data;

    }

    catch(e){

        debug(
            e.message
        );


        if(e?.stack){

            debug(
                e.stack
            );

        }


        throw e;

    }

}


export async function askAI(prompt){

    return await generateScript(
        prompt,
        0
    );

}
