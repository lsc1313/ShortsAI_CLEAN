import fs from "fs";
import path from "path";
import { execSync } from "child_process";

import {
    VIDEO_DIR
} from "./directory.js";
import {
    getGlobalEffect,
    getRankingEffect,
    getShoppingEffect,
    getDirectorEffect
} from "./effects.js";


/*
=====================================================
SHORTSAI SCENE ENGINE V3
=====================================================

GLOBAL
    1 Scene = 이미지 1장
    Scene 전체 시간 기준
    1.00 -> 약 1.15 Zoom

RANKING
    1 Scene = 이미지 3장
    각 이미지가 독립적으로
    1.00 -> 약 1.10 Zoom

ENDING
    직전 이미지 유지
    Motion 없음

렌더링
    2160x3840 Motion 계산
        ↓
    1080x1920 Downscale

목적
    - Zoom 끝 팅김 방지
    - 미세 떨림 감소
    - Scene 길이에 관계없이
      시작/끝 Zoom 강도 일정
=====================================================
*/


function normalizeType(type){

    const value =
        String(
            type || "global"
        )
        .toLowerCase()
        .trim();

const allowed = [

"ranking",
"ending",

"hook",
"usage",
"lifestyle",
"detail",
"result",
"cta",

"global"

];

if(allowed.includes(value)){
    return value;
}

return "global";

}


function getFrameCount(time){

    const seconds =
        Number(time);

    if(
        !Number.isFinite(seconds) ||
        seconds <= 0
    ){
        return 1;
    }

    return Math.max(
        1,
        Math.round(
            seconds * 30
        )
    );

}

function makeVideoScene(
    video,
    time,
    output
){

    execSync(

`ffmpeg -y \
-stream_loop -1 \
-i "${video}" \
-t ${time} \
-vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30" \
-an \
-c:v libx264 \
-pix_fmt yuv420p \
-preset veryfast \
-crf 20 \
"${output}"`

    ,{
        stdio:"ignore"
    });

}

function makeStillScene(
    image,
    time,
    output
){

    execSync(

`ffmpeg -y \
-loop 1 \
-i "${image}" \
-t ${time} \
-vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30" \
-r 30 \
-c:v libx264 \
-pix_fmt yuv420p \
-preset veryfast \
-crf 20 \
"${output}"`

    ,{
        stdio:"ignore"
    });

}


function makeMotionScene(
    image,
    time,
    output,
    sceneType,
    options = {}
){

    const frames =
        getFrameCount(time);


let effect;

if(
    options?.shot ||
    options?.cameraMove ||
    options?.motion
){

    effect =
        getDirectorEffect(
            frames,
            {
                shot:
                    options.shot,

                cameraMove:
                    options.cameraMove,

                motion:
                    options.motion
            }
        );

}
else{

    switch(sceneType){

        case "ranking":

            effect =
                getRankingEffect(
                    frames
                );

            break;


        case "hook":
        case "usage":
        case "lifestyle":
        case "detail":
        case "result":
        case "cta":

            effect =
                getShoppingEffect(
                    sceneType,
                    frames
                );

            break;


        default:

            effect =
                getGlobalEffect(
                    frames
                );

    }

}


    /*
    =================================================
    중요

    바로 1080x1920에서 Zoom하지 않는다.

    2160x3840으로 먼저 확대
        ↓
    고해상도 공간에서 Zoom 계산
        ↓
    1080x1920으로 Downscale

    테스트에서 통과한 Smooth Motion 방식.
    =================================================
    */
const cleanEffect =
    String(effect)
        .replace(/\r?\n/g, "")
        .trim();

const command =
    `ffmpeg -y -loop 1 -i "${image}" -t ${time} ` +
    `-vf "scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840,${cleanEffect},scale=1080:1920" ` +
    `-r 30 -c:v libx264 -pix_fmt yuv420p -preset veryfast -crf 20 "${output}"`;

execSync(
    command,
    {
       stdio: "ignore"
    }
);

}


export function makeScene(
    images,
    time,
    index,
    options = {}
){

    if(!Array.isArray(images)){
        images=[images];
    }


    images =
        images.filter(Boolean);


    if(images.length===0){

        throw new Error(
            `Scene ${index} : 이미지 없음`
        );

    }


    const sceneType =
        normalizeType(
            options.sceneType
        );


    const output =
        path.join(
            VIDEO_DIR,
            `scene_${index}.mp4`
        );


    /*
    =================================================
    이미지 1장
    =================================================
    */


if(images.length===1){

    const source =
        images[0];

    const isVideo =
        /\.(mp4|mov|webm|m4v)$/i.test(
            String(source)
        );

    if(isVideo){

        makeVideoScene(
            source,
            time,
            output
        );

    }
    else if(sceneType === "ending"){

        makeStillScene(
            source,
            time,
            output
        );

    }
    else{

        makeMotionScene(
            source,
            time,
            output,
            sceneType,
            options
        );

    }

    return output;
}

    /*
    =================================================
    여러 이미지

    RANKING:
        일반적으로 1 Scene = 이미지 3장

    Scene 전체 시간을 이미지 수로 나누고
    각 이미지는 독립적인 Motion으로 렌더링한다.

    예:
        Scene 6초 / 이미지 3장
            ↓
        이미지당 2초
            ↓
        각 이미지
        1.00 -> 약 1.10
    =================================================
    */

    const part =
        Number(time) /
        images.length;


    const tempScenes = [];


    for(
        let i=0;
        i<images.length;
        i++
    ){

        const tempOutput =
            path.join(
                VIDEO_DIR,
                `scene_${index}_part_${i}.mp4`
            );


        if(sceneType === "ending"){

            makeStillScene(
                images[i],
                part,
                tempOutput
            );

        }
        else{

makeMotionScene(
    images[i],
    part,
    tempOutput,
    sceneType,
    options
);

        }


        tempScenes.push(
            tempOutput
        );

    }


    /*
    =================================================
    PART CONCAT
    =================================================
    */

    const list =
        path.join(
            VIDEO_DIR,
            `scene_${index}_parts.txt`
        );


    let txt = "";


    for(const file of tempScenes){

        const safe =
            path.resolve(file)
            .replace(
                /'/g,
                "'\\''"
            );

        txt +=
            `file '${safe}'\n`;

    }


    fs.writeFileSync(
        list,
        txt,
        "utf8"
    );


    execSync(

`ffmpeg -y \
-f concat \
-safe 0 \
-i "${list}" \
-c copy \
"${output}"`

    ,{
        stdio:"ignore"
    });


    return output;

}
