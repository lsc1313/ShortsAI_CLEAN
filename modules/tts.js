import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import {
    success,
    debug
} from "./logger.js";

const AUDIO_DIR = "media/audio";

function ensureDir(){

    if(!fs.existsSync(AUDIO_DIR)){

        fs.mkdirSync(
            AUDIO_DIR,
            {
                recursive:true
            }
        );

    }

}

function cleanText(text){

    if(!text)
        return "";

    return String(text)

        .replace(/\s+/g," ")

        .replace(/([.!?])/g,"$1 ")

        .replace(/,/g,", ")

        .replace(/~/g,"")

        .replace(/  +/g," ")

        .trim();

}

function createVoice(text,file){

    try{

        const safe = cleanText(text)

            .replace(
                /([0-9]),([0-9]{3})/g,
                "$1$2"
            )

            .replace(
                /([0-9]),([0-9]{3})/g,
                "$1$2"
            )

            .replace(/%/g,"퍼센트")

            .replace(/℃/g,"도")

            .replace(
                /\bkm\b/gi,
                "킬로미터"
            )

            .replace(
                /\bkg\b/gi,
                "킬로그램"
            )

            .replace(
                /\bAI\b/g,
                "에이아이"
            )

            .replace(
                /\bNASA\b/g,
                "나사"
            )

            .replace(
                /\bDNA\b/g,
                "디엔에이"
            )

            .replace(
                /\bRNA\b/g,
                "알엔에이"
            )

            .replace(
                /&/g,
                "그리고"
            )

            .replace(
                /@/g,
                "골뱅이"
            )

            .replace(
                /\//g,
                " "
            )

            .replace(
                /[()]/g,
                " "
            )

            .replace(
                /\s+/g,
                " "
            )

            .replace(
                /"/g,
                "'"
            )

            .trim();


        execSync(

`edge-tts \
--voice ko-KR-SunHiNeural \
--rate=+15% \
--pitch=+0Hz \
--text "${safe}" \
--write-media "${file}"`,

            {
                stdio:"ignore"
            }

        );


        return true;

    }

    catch(e){

        console.log(
            "Edge TTS 실패:",
            e.message
        );

        return false;

    }

}



function createVoiceEnglish(text,file){

    try{

        const safe =
            cleanText(text)
                .replace(/([0-9]),([0-9]{3})/g, "$1$2")
                .replace(/%/g, " percent")
                .replace(/\u2103/g, " degrees Celsius")
                .replace(/&/g, " and ")
                .replace(/@/g, " at ")
                .replace(/\//g, " ")
                .replace(/[()]/g, " ")
                .replace(/\s+/g, " ")
                .replace(/"/g, "'")
                .trim();

        execSync(

`edge-tts \
--voice en-US-GuyNeural \
--rate=+10% \
--pitch=+0Hz \
--text "${safe}" \
--write-media "${file}"`,

            {
                stdio:"ignore"
            }

        );

        return true;

    }
    catch(e){

        console.log(
            "Edge TTS EN FAILED:",
            e.message
        );

        return false;

    }

}


export async function createTTS(director, language = "ko"){

    ensureDir();


    /*
    =====================================================
    SCRIPT ↔ TTS MAPPING LOCK

    subtitle.js / video.js는
    script와 voices를 동일 배열 순서로 매칭한다.

    따라서 중간 TTS 하나라도 누락된 상태에서
    계속 진행하면 이후 모든 scene이 한 칸씩 밀린다.

    원칙:

    1. 음성 텍스트가 존재하는 script만 TTS 대상
    2. 대상 하나라도 생성 실패하면 전체 TTS 실패
    3. voices 배열 압축/재정렬 금지
    4. 성공한 경우에만 완전한 voices 배열 반환

    이렇게 하면 기존 FINAL LOCK subtitle.js와
    현재 video.js의 배열 매핑을 그대로 보존할 수 있다.
    =====================================================
    */


const voiceItems =
    director.scenes
        .map((scene,index)=>({

            scene:index+1,

voice:
    scene.voice ||
    scene.tts ||
    scene.script ||
    "",

            text:
                scene.tts ||
                scene.script ||
                ""

        }))
        .filter(item=>
            cleanText(item.text)
        );


    if(voiceItems.length===0){

        throw new Error(
            "TTS 대상 대본이 없습니다."
        );

    }


    const voices = [];


    for(
        let index=0;
        index<voiceItems.length;
        index++
    ){

        const item =
            voiceItems[index];


        let text =

            item.voice ||
            item.text ||
            "";


        text =
            cleanText(text);


        /*
        여기까지 왔는데 text가 없다면
        매핑 안전성을 위해 즉시 중단한다.
        */
        if(!text){

            throw new Error(
                `TTS 매핑 오류 : ${index+1}번 음성 텍스트 없음`
            );

        }


        const scene =
            index + 1;


        const file =
            path.join(

                AUDIO_DIR,

                `voice_${scene}.mp3`

            );


        /*
        이전 작업에서 남은 동일 번호 파일이 있으면
        성공으로 오인하지 않도록 먼저 제거한다.
        */
        if(fs.existsSync(file)){

            fs.unlinkSync(file);

        }


        debug(
            `Edge TTS ${scene}`
        );


        const ok =
            language === "en"
                ? createVoiceEnglish(
                    text,
                    file
                )
                : createVoice(
                    text,
                    file
                );


        if(!ok){

            throw new Error(
                `TTS 생성 실패 : voice_${scene}.mp3`
            );

        }


        if(!fs.existsSync(file)){

            throw new Error(
                `TTS 파일 없음 : voice_${scene}.mp3`
            );

        }


        const size =
            fs.statSync(file).size;


        debug(
            `SIZE ${size}`
        );


        if(size < 5000){

            try{

                fs.unlinkSync(file);

            }catch{}

            throw new Error(
                `TTS 파일 오류 : voice_${scene}.mp3 / ${size} bytes`
            );

        }


        voices.push({

            scene,

            file,

            text

        });

    }


    /*
    =====================================================
    FINAL INTEGRITY CHECK

    TTS 대상 수와 실제 생성된 음성 수가
    단 하나라도 다르면 이후 파이프라인 진입 금지.
    =====================================================
    */

    if(
        voices.length !==
        voiceItems.length
    ){

        throw new Error(

            `TTS 매핑 무결성 오류 : ` +
            `SCRIPT ${voiceItems.length} / ` +
            `VOICE ${voices.length}`

        );

    }


    /*
    scene 번호 역시
    1,2,3... 연속인지 마지막으로 검증한다.
    */

    for(
        let i=0;
        i<voices.length;
        i++
    ){

        if(
            voices[i].scene !==
            i+1
        ){

            throw new Error(
                `TTS scene 매핑 오류 : index=${i} scene=${voices[i].scene}`
            );

        }

    }


    success(
        "TTS COMPLETE"
    );


    let totalSize = 0;


    for(const voice of voices){

        totalSize +=
            fs.statSync(
                voice.file
            ).size;

    }


    debug(
        `TOTAL ${Math.round(totalSize/1024)} KB`
    );


    debug(
        `TTS MAPPING LOCK : ${voices.length}/${voiceItems.length}`
    );


    return voices;

}
