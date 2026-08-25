import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import {
    success,
    debug
} from "../logger.js";


/*
=========================================================
CHINESE TTS
=========================================================

Chinese Localizer
        ↓
scene.tts
        ↓
Edge TTS
        ↓
zh-CN-XiaoxiaoNeural
        ↓
media/audio_zh/voice_1.mp3
...

기존 modules/tts.js와 완전히 분리한다.

한국어 TTS에는 영향을 주지 않는다.
=========================================================
*/


const AUDIO_DIR =
    "media/audio_zh";


const VOICE =
    "zh-CN-XiaoxiaoNeural";


function ensureDir(){

    if(
        !fs.existsSync(
            AUDIO_DIR
        )
    ){

        fs.mkdirSync(
            AUDIO_DIR,
            {
                recursive: true
            }
        );

    }

}


function cleanChineseText(
    text
){

    if(!text){

        return "";

    }


    return String(text)

        .replace(
            /\s+/g,
            " "
        )

        .replace(
            /~/g,
            ""
        )

        .replace(
            /[()]/g,
            " "
        )

        .replace(
            /"/g,
            "'"
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim();

}


function createChineseVoice(
    text,
    file
){

    const safe =
        cleanChineseText(
            text
        );


    if(!safe){

        throw new Error(
            "중국어 TTS 텍스트가 비어있습니다."
        );

    }


    try{

        execFileSync(

            "edge-tts",

            [
                "--voice",
                VOICE,

                "--rate=+5%",

                "--pitch=+0Hz",

                "--text",
                safe,

                "--write-media",
                file
            ],

            {
                stdio:
                    "ignore"
            }

        );


        return true;

    }

    catch(error){

        console.error(
            "[CHINESE TTS] Edge TTS 실패:",
            error?.message ||
            error
        );

        return false;

    }

}


export async function createChineseTTS(
    director
){

    ensureDir();


    if(
        !director ||
        !Array.isArray(
            director.scenes
        )
    ){

        throw new Error(
            "createChineseTTS(): scenes가 없습니다."
        );

    }


    const scenes =
        director.scenes;


    if(
        scenes.length === 0
    ){

        throw new Error(
            "createChineseTTS(): TTS 대상 Scene이 없습니다."
        );

    }


    const voices = [];


    for(
        let index = 0;
        index < scenes.length;
        index++
    ){

        const scene =
            scenes[index];


        const sceneNumber =
            index + 1;


        const text =
            cleanChineseText(
                scene.tts ||
                scene.script ||
                ""
            );


        if(!text){

            throw new Error(
                `중국어 TTS Scene ${sceneNumber} 텍스트 없음`
            );

        }


        const file =
            path.join(
                AUDIO_DIR,
                `voice_${sceneNumber}.mp3`
            );


        /*
        이전 파일 제거
        */

        if(
            fs.existsSync(
                file
            )
        ){

            fs.unlinkSync(
                file
            );

        }


        debug(
            `[CHINESE TTS] ${sceneNumber} / ${VOICE}`
        );


        const ok =
            createChineseVoice(
                text,
                file
            );


        if(!ok){

            throw new Error(
                `중국어 TTS 생성 실패 : voice_${sceneNumber}.mp3`
            );

        }


        if(
            !fs.existsSync(
                file
            )
        ){

            throw new Error(
                `중국어 TTS 파일 없음 : voice_${sceneNumber}.mp3`
            );

        }


        const size =
            fs.statSync(
                file
            ).size;


        debug(
            `[CHINESE TTS] SIZE ${size}`
        );


        if(
            size < 5000
        ){

            try{

                fs.unlinkSync(
                    file
                );

            }
            catch{}

            throw new Error(
                `중국어 TTS 파일 오류 : voice_${sceneNumber}.mp3 / ${size} bytes`
            );

        }


        voices.push({

            scene:
                sceneNumber,

            file,

            text,

            voice:
                VOICE

        });

    }


    /*
    =====================================================
    FINAL INTEGRITY CHECK
    =====================================================
    */

    if(
        voices.length !==
        scenes.length
    ){

        throw new Error(

            `중국어 TTS 매핑 오류 : ` +
            `SCENE ${scenes.length} / ` +
            `VOICE ${voices.length}`

        );

    }


    for(
        let i = 0;
        i < voices.length;
        i++
    ){

        if(
            voices[i].scene !==
            i + 1
        ){

            throw new Error(
                `중국어 TTS Scene 매핑 오류 : ${i + 1}`
            );

        }

    }


    success(
        `CHINESE TTS COMPLETE : ${voices.length} scenes`
    );


    return voices;

}


export default createChineseTTS;
