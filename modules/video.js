import fs from "fs";
import {
    searchVideo
} from "./image/videoSearch.js";

import {
    downloadVideo
} from "./video/download.js";
import {
    mkdir
} from "./video/directory.js";

import {
    duration
} from "./video/duration.js";

import {
    makeScene
} from "./video/scene.js";

import {
    concatVideo,
    concatAudio
} from "./video/concat.js";

import {
    renderVideo
} from "./video/render.js";

import {
    debug,
    success
} from "./logger.js";


/*
=====================================================
SHORTSAI VIDEO ENGINE V2
=====================================================

GLOBAL
    이미지 1장
    부드러운 안정적 모션

RANKING
    이미지 여러 장
    이미지마다 조금 더 역동적인 모션

ENDING
    ending.jpg 사용 안 함
    직전 본문 이미지를 그대로 유지

=====================================================
*/


function cleanText(text="") {
    return String(text || "")
        .replace(/(\d+),(\d+)/g, "$1$2")       // 18,000 -> 18000
        .replace(/(\d+)\.(\d+)/g, "$1점$2")    // 0.6 -> 0점6 (공백 없이 매끄럽게 발음)
        .replace(/\s+/g, " ")
        .trim();
}


function buildScriptVoiceItems(script){

    return script
        .map((item,index)=>({

            ...item,

            _scriptIndex:index,

            _voiceText:
                cleanText(
                    item.voice ||
                    item.text ||
                    item.subtitle ||
                    ""
                )

        }))
        .filter(
            item=>item._voiceText
        );

}


function normalizeSceneType(item){

    if(item?.type === "ending"){
        return "ending";
    }

const type =
    String(
        item?.sceneType ||
        item?.scene_type ||
        "global"
    )
        .toLowerCase()
        .trim();

    if(type === "ranking"){
        return "ranking";
    }

    return "global";

}


export async function createVideo(
    director,
    images,
    voices,
    channel = ""
){

    mkdir();

const script =
    director.scenes;

    success(
        "VIDEO START"
    );


    /*
    =====================================================
    이미지 scene별 정리
    =====================================================
    */

    const sceneImages =
        new Map();


    for(const img of images){

        if(
            !img ||
            !img.file ||
            !fs.existsSync(img.file)
        ){
            continue;
        }


        if(
            !sceneImages.has(img.scene)
        ){

            sceneImages.set(
                img.scene,
                []
            );

        }


        sceneImages
            .get(img.scene)
            .push(img.file);

    }


    if(sceneImages.size===0){

        throw new Error(
            "이미지 없음"
        );

    }


    /*
    =====================================================
    실제 생성된 TTS만 사용
    =====================================================
    */

    const validVoices =
        voices.filter(
            voice=>
                voice?.file &&
                fs.existsSync(
                    voice.file
                )
        );


    if(validVoices.length===0){

        throw new Error(
            "음성 없음"
        );

    }


    /*
    =====================================================
    SCRIPT ↔ VOICE 대응

    createTTS()는 text가 없는 script 항목을 건너뛰므로
    음성이 존재하는 script 항목만 같은 순서로 맞춘다.
    =====================================================
    */

const scriptVoiceItems =
    script;


const scenes = [];

const transitions = [];

let lastImage = null;


    for(
        let i=0;
        i<validVoices.length;
        i++
    ){

        const voice =
            validVoices[i];


        const item =
            scriptVoiceItems[i] ||
            null;


        const sceneType =
            normalizeSceneType(
                item
            );


        const totalTime =
            duration(
                voice.file
            );


        /*
        =================================================
        ENDING

        새로운 THE END 이미지를 사용하지 않는다.

        직전 본문 이미지(lastImage)를 그대로 유지하면서
        CTA 음성 길이만큼 장면을 이어간다.
        =================================================
        */

        if(sceneType === "ending"){

            if(!lastImage){

                debug(
                    "ENDING SKIP",
                    "이전 이미지 없음"
                );

                continue;

            }


            debug(
                "ENDING FLOW",
                `last image / ${totalTime.toFixed(2)} sec`
            );

scenes.push(

    makeScene(
        lastImage,
        totalTime,
        scenes.length,
        {
            sceneType: "ending",

            shot:
                item?.shot,

            cameraMove:
                item?.cameraMove,

            motion:
                item?.motion,

            transition:
                item?.transition,

            duration:
                item?.duration
        }
    )

);

transitions.push(
    item?.transition || "cut"
);

continue;

}


        /*
        =================================================
        일반 장면 이미지

        이미지 모듈의 scene 번호는
        실제 voice 순서 기준으로 유지되고 있으므로
        우선 i+1을 사용한다.
        =================================================
        */

        /*
        =================================================
        HOTDEAL CARD WIRING

        HOTDEAL 구조:

        scene 1 = HOOK
        scene 2 = card_01
        scene 3 = card_02
        ...
        scene N = 마지막 상품카드
        scene N+1 = ENDING

        일반 채널은 기존 i+1을 그대로 사용한다.
        =================================================
        */

        // 씬 인덱스 매칭: Hook(i=0)과 상품1(i=1)은 모두 1번 카드를 사용하도록 보정
        let targetScene = i + 1;
        if (channel === "shopping" || director?.hotdeal === true) {
            if (i === 0) targetScene = 1;        // Hook -> 1번 카드 (Scene 1)
            else if (i === 1) targetScene = 2;   // 상품1 -> 1번 카드 (Scene 2)
            else targetScene = i + 1;             // 상품2부터 순서대로
        }

        const imageList = sceneImages.get(targetScene) || sceneImages.get(i + 1) || sceneImages.get(i) || [];

        

let videoFile = null;


const selectedVideo =
    imageList.find(
        img =>
            img?.mediaType === "video" &&
            img?.file &&
            fs.existsSync(img.file)
    );

if(
    selectedVideo
){

    videoFile =
        selectedVideo.file;

    debug(
        `Scene ${i+1}`,
        "VIDEO SELECTED BY MEDIA REVIEWER",
        selectedVideo.provider,
        selectedVideo.score
    );

}
if(
    videoFile &&
    sceneType !== "ending"
){

    try{

        const videoScene =
            makeScene(
                videoFile,
                totalTime,
                scenes.length,
                {
                    sceneType,
                    shot:item?.shot,
                    cameraMove:item?.cameraMove,
                    motion:item?.motion,
                    transition:item?.transition,
                    duration:item?.duration
                }
            );

        if(
            videoScene &&
            fs.existsSync(videoScene) &&
            fs.statSync(videoScene).size > 10000
        ){

            scenes.push(
                videoScene
            );

            transitions.push(
                item?.transition || "cut"
            );

            lastImage =
                videoFile;

            debug(
                `Scene ${i+1}`,
                "VIDEO RENDER PASS"
            );

            continue;

        }

        debug(
            `Scene ${i+1} VIDEO RENDER FALLBACK : 결과 파일 없음 또는 파일 크기 부족`
        );

    }
    catch(e){

        debug(
            `Scene ${i+1} VIDEO RENDER FALLBACK : ${e.message}`
        );

    }

}

        if(imageList.length===0){

            throw new Error(
                `[VIDEO] Scene ${i+1} FAILED : VIDEO AND IMAGE BOTH UNAVAILABLE / CORE SUBJECT : ${item?.coreSubject || "UNKNOWN"}`
            );

        }


        /*
        =================================================
        GLOBAL / RANKING
        =================================================
        */

        /*
        =================================================
        GLOBAL / RANKING IMAGE WIRING

        GLOBAL
            1 Scene = 이미지 1장

        RANKING
            1 Scene = 이미지 여러 장
            현재 기준 일반적으로 3장

        이미지 분할 및 각 이미지별 시간 계산은
        scene.js가 담당한다.
        =================================================
        */

        debug(
            `Scene ${i+1}`,
            sceneType,
            `${imageList.length} images`,
            `${totalTime.toFixed(2)} sec`
        );


scenes.push(

    makeScene(
        imageList,
        totalTime,
        scenes.length,
        {
            sceneType,

            shot:
                item?.shot,

            cameraMove:
                item?.cameraMove,

            motion:
                item?.motion,

            transition:
                item?.transition,

            duration:
                item?.duration
        }
    )

);

transitions.push(
    item?.transition || "cut"
);


        /*
        마지막 실제 본문 이미지를 기억한다.

        ENDING CTA에서는 RANKING의 경우에도
        마지막 이미지가 그대로 유지되어야 한다.
        */

        lastImage =
            imageList[
                imageList.length - 1
            ];

    }


    if(scenes.length===0){

        throw new Error(
            "생성된 영상 장면이 없습니다."
        );

    }


    /*
    =====================================================
    VIDEO CONCAT
    =====================================================
    */

const merged =
    concatVideo(
        scenes,
    );


    /*
    =====================================================
    AUDIO CONCAT
    =====================================================
    */

    const voiceFiles =
        validVoices.map(
            voice=>voice.file
        );


    const audio =
        concatAudio(
            voiceFiles
        );


    /*
    =====================================================
    FINAL RENDER

    기존 1.10배속 로직 유지
    =====================================================
    */

const output =
    renderVideo(
        merged,
        audio,
        channel
    );

    success(
        "VIDEO COMPLETE"
    );


    debug(
        output
    );


    return {
        file:output
    };

}
