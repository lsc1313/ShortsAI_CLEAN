import fs from "fs";
import { execSync } from "child_process";

import {
    success,
    debug
} from "./logger.js";


const SUBTITLE_DIR =
    "media/subtitle";


/*
=====================================================
SHORTSAI SUBTITLE ENGINE V2
=====================================================

목표

1. 최종 1.10배속 영상과 정확한 시간축 일치
2. 이전 자막 / 다음 자막 절대 겹침 방지
3. 쇼츠용 짧은 자막 단위
4. 최대 2줄
5. HOOK / BODY / RANKING / CTA 스타일 분리
6. 핵심 단어 강조
7. 한 위치에서 교체되는 방식

=====================================================
*/


function ensureDir(){

    if(
        !fs.existsSync(
            SUBTITLE_DIR
        )
    ){

        fs.mkdirSync(
            SUBTITLE_DIR,
            {
                recursive:true
            }
        );

    }

}


function assTime(sec){

    sec =
        Math.max(
            0,
            Number(sec) || 0
        );


    const h =
        Math.floor(
            sec / 3600
        );


    const m =
        Math.floor(
            (sec % 3600) / 60
        );


    const s =
        Math.floor(
            sec % 60
        );


    const cs =
        Math.floor(
            (
                sec -
                Math.floor(sec)
            ) * 100
        );


    return (
        `${h}:` +
        `${String(m).padStart(2,"0")}:` +
        `${String(s).padStart(2,"0")}.` +
        `${String(cs).padStart(2,"0")}`
    );

}


function getDuration(file){

    try{

        const result =
            execSync(

`ffprobe -v error \
-show_entries format=duration \
-of csv=p=0 \
"${file}"`

            ,{
                encoding:"utf8"
            });


        const value =
            Number(
                result.trim()
            );


        if(
            Number.isFinite(value) &&
            value > 0
        ){

            return value;

        }

    }
    catch{
    }


    return 3;

}


function cleanText(text=""){

    return String(text)

        .replace(/\r/g," ")

        .replace(/\n/g," ")

        .replace(/\s+/g," ")

        .trim();

}


/*
=====================================================
ASS 특수문자 보호
=====================================================
*/

function escapeASS(text=""){

    /*
    ASS 줄바꿈 명령 \N 보호

    splitText()가 만드는 JS 문자열:
        "\\N"

    실제 문자열:
        \N

    따라서 정규식 /\\N/g 로
    백슬래시 1개 + N을 찾아야 한다.
    */

    const LINE_BREAK =
        "__SHORTSAI_ASS_LINEBREAK__";

    return String(text)

        /*
        실제 \N 보호
        */
        .replace(/\\N/g, LINE_BREAK)

        /*
        그 외 백슬래시 제거
        */
        .replace(/\\/g, "")

        .replace(/{/g, "(")

        .replace(/}/g, ")")

        /*
        ASS 파일에 필요한 실제 \N 복원
        */
        .replaceAll(
            LINE_BREAK,
            "\\N"
        );

}


/*
=====================================================
SHORTS 자막 분할

기존 방식:
문장 길이에 따라 2줄 묶음 위주

V2:
짧은 의미 덩어리를 빠르게 교체

목표:
보통 7~14자
최대 약 18자

=====================================================
*/

function splitText(text){

    text =
        cleanText(text);


    if(!text){
        return [];
    }


    /*
    문장부호를 살리면서
    먼저 의미 단위로 나눈다.
    */

    const sentenceParts =
        text
        .split(
            /(?<=[.!?。！？])\s+|(?<=[,，])\s*/
        )
        .map(
            x=>x.trim()
        )
        .filter(Boolean);


    const chunks = [];


    for(const sentence of sentenceParts){

        if(
            sentence.length <= 14
        ){

            chunks.push(
                sentence
            );

            continue;

        }


        const words =
            sentence.split(/\s+/);


        let current = "";


        for(const word of words){

            const candidate =
                current
                    ? `${current} ${word}`
                    : word;


            /*
            한 줄 기준 약 14자
            */

            if(
                candidate.length <= 14
            ){

                current =
                    candidate;

            }
            else{

                if(current){

                    chunks.push(
                        current
                    );

                }


                /*
                띄어쓰기 없는 긴 문자열 대응
                */

                if(
                    word.length > 18
                ){

                    let remain =
                        word;


                    while(
                        remain.length > 18
                    ){

                        chunks.push(
                            remain.slice(
                                0,
                                18
                            )
                        );


                        remain =
                            remain.slice(
                                18
                            );

                    }


                    current =
                        remain;

                }
                else{

                    current =
                        word;

                }

            }

        }


        if(current){

            chunks.push(
                current
            );

        }

    }


    /*
    너무 짧은 조각은
    다음/이전 조각과 자연스럽게 합친다.
    */

    const merged = [];


    for(const chunk of chunks){

        if(
            merged.length > 0 &&
            chunk.length <= 3
        ){

            const previous =
                merged[
                    merged.length - 1
                ];


            if(
                (
                    previous.length +
                    1 +
                    chunk.length
                ) <= 16
            ){

                merged[
                    merged.length - 1
                ] =
                    `${previous} ${chunk}`;

                continue;

            }

        }


        merged.push(
            chunk
        );

    }


    /*
    2줄이 필요한 경우도
    반드시 하나의 Dialogue 안에서 처리한다.

    절대로 두 Dialogue를 동시에 띄우지 않는다.
    */

    const result = [];


    for(
        let i=0;
        i<merged.length;
        i++
    ){

        const first =
            merged[i];


        const second =
            merged[i+1];


        /*
        각각 짧고 두 줄로 묶었을 때
        전체가 과도하게 길지 않은 경우만 2줄.
        */

        if(
            second &&
            first.length <= 11 &&
            second.length <= 11 &&
            (
                first.length +
                second.length
            ) <= 20
        ){

            result.push(
                `${first}\\N${second}`
            );

            i++;

        }
        else{

            result.push(
                first
            );

        }

    }


    return result;

}


/*
=====================================================
핵심어 강조

ASS BGR 색상

노랑:
&H0000FFFF&

흰색:
&H00FFFFFF&

=====================================================
*/


/*
=====================================================
CTA SAFE LINE WRAP

CTA는 좋아요 / 구독 등 강조 태그까지 들어가므로
일반 BODY보다 좌우 안전영역을 넓게 사용한다.

기존 splitText 결과가 한 줄로 길게 남는 경우
공백 기준으로 자연스럽게 2줄로 나눈다.

ASS 실제 줄바꿈은 \N.
=====================================================
*/

function makeCTASafeLine(text){

    text = String(text || "");

    /*
    이미 2줄이면 그대로 유지
    */
    if(text.includes("\\N")){
        return text;
    }

    /*
    짧은 CTA는 그대로
    */
    if(text.length <= 14){
        return text;
    }

    const words =
        text.split(/\s+/)
            .filter(Boolean);

    if(words.length < 2){
        return text;
    }

    let bestIndex = -1;
    let bestDiff = Infinity;

    for(
        let i=1;
        i<words.length;
        i++
    ){

        const first =
            words.slice(0,i)
                .join(" ");

        const second =
            words.slice(i)
                .join(" ");

        /*
        각 줄이 지나치게 길면 제외
        */
        if(
            first.length > 13 ||
            second.length > 13
        ){
            continue;
        }

        const diff =
            Math.abs(
                first.length -
                second.length
            );

        if(diff < bestDiff){

            bestDiff = diff;
            bestIndex = i;

        }

    }

    if(bestIndex === -1){
        return text;
    }

    return (
        words
            .slice(0,bestIndex)
            .join(" ")
        +
        "\\N"
        +
        words
            .slice(bestIndex)
            .join(" ")
    );

}


function highlight(text){

    const keywords = [

        "충격",
        "사실",
        "비밀",
        "최초",
        "마지막",

        "1위",
        "2위",
        "3위",
        "4위",
        "5위",

        "100%",

        "영생",
        "불멸",
        "노화",

        "AI",
        "인공지능",

        "우주",
        "공룡",
        "해파리",
        "지구",
        "인간",

        "구독",
        "좋아요"

    ];


    let result =
        escapeASS(text);


    for(const word of keywords){

        const replacement =
            `{\\b1\\c&H0000FFFF&}${word}` +
            `{\\c&H00FFFFFF&\\b0}`;


        result =
            result.replaceAll(
                word,
                replacement
            );

    }


    return result;

}


/*
=====================================================
SCRIPT TYPE → STYLE
=====================================================
*/

function getStyle(item,index){

    if(
        item?.type === "hook" ||
        index === 0
    ){

        return "Hook";

    }


    if(
        item?.type === "ending"
    ){

        return "CTA";

    }


    if(
        String(
            item?.sceneType || ""
        ).toLowerCase() ===
        "ranking"
    ){

        return "Ranking";

    }


    return "Shorts";

}


/*
=====================================================
자막 등장 효과

짧은 fade만 사용.

과도한 움직임/튀는 애니메이션은
가독성을 떨어뜨리므로 사용하지 않는다.
=====================================================
*/

function getOverride(style){

    if(style === "Hook"){

        return (
            "{\\an2" +
            "\\fad(70,50)" +
            "\\shad0" +
            "\\blur0.4" +
            "\\fscx100" +
            "\\fscy100}"
        );

    }


    if(style === "CTA"){

        return (
            "{\\an2" +
            "\\fad(80,80)" +
            "\\shad0" +
            "\\blur0.4}"
        );

    }


    return (
        "{\\an2" +
        "\\fad(45,35)" +
        "\\shad0" +
        "\\blur0.35}"
    );

}


/*
=====================================================
VOICE ↔ SCRIPT 매칭

TTS는 text 없는 script를 skip하므로
동일한 방식으로 유효 script만 추린다.
=====================================================
*/

function getVoiceScriptItems(script){

    return script.filter(item=>{

        const text =
            cleanText(
                item?.voice ||
                item?.subtitle ||
                item?.text ||
                ""
            );


        return Boolean(text);

    });

}


export async function createSubtitle(
    director,
    voices
){

    ensureDir();

const script =
    director.scenes;

    const output =
        `${SUBTITLE_DIR}/shorts.ass`;


    /*
    =====================================================
    STYLE

    1080 x 1920 Shorts

    위치:
    화면 중앙보다 약간 아래

    HOOK:
    강한 크기

    BODY:
    읽기 쉬운 굵은 자막

    RANKING:
    BODY보다 약간 강하게

    CTA:
    마지막 유도문구 강조
    =====================================================
    */


    const header = `[Script Info]
Title: ShortsAI Studio
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Hook,Noto Sans CJK KR,96,&H00FFFFFF,&H0000FFFF,&H000000,&H80000000,-1,0,0,0,100,100,-1,0,1,6,0,2,70,70,610,1
Style: Shorts,Noto Sans CJK KR,82,&H00FFFFFF,&H0000FFFF,&H000000,&H80000000,-1,0,0,0,100,100,-1,0,1,5,0,2,75,75,610,1
Style: Ranking,Noto Sans CJK KR,88,&H00FFFFFF,&H0000FFFF,&H000000,&H80000000,-1,0,0,0,100,100,-1,0,1,5,0,2,75,75,610,1
Style: CTA,Noto Sans CJK KR,80,&H00FFFFFF,&H0000FFFF,&H000000,&H80000000,-1,0,0,0,100,100,-1,0,1,5,0,2,85,85,610,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
`;


    let events = "";


    /*
    =====================================================
    핵심:
    영상 전체가 마지막 render에서 1.10배속된다.

    따라서 자막도 처음부터

        원본 TTS 길이 / 1.10

    시간축을 사용한다.

    이전 코드처럼
    End는 원본,
    다음 Start만 /1.10
    하지 않는다.
    =====================================================
    */


    let current = 0;


    const validScript =
        getVoiceScriptItems(
            script
        );


    const validVoices =
        voices.filter(
            voice=>
                voice?.file &&
                fs.existsSync(
                    voice.file
                )
        );


    const count =
        Math.min(
            validScript.length,
            validVoices.length
        );


    for(
        let i=0;
        i<count;
        i++
    ){

        const item =
            validScript[i];


        const voice =
            validVoices[i];


        const text =
            cleanText(
                item.voice ||
                item.subtitle ||
                item.text ||
                ""
            );


        if(!text){
            continue;
        }


        /*
        원본 TTS duration
        */

        const rawDuration =
            getDuration(
                voice.file
            );


        /*
        최종 영상 1.10배속 기준 duration
        */

        const finalDuration =
            rawDuration /
            1.10;


        const chunks =
            splitText(
                text
            );


        if(
            chunks.length===0
        ){

            current +=
                finalDuration;

            continue;

        }


        const style =
            getStyle(
                item,
                i
            );


        /*
        각 자막 조각에 동일 시간을 주는 것보다
        글자 수 비율로 시간을 배분한다.

        긴 자막 = 조금 오래
        짧은 자막 = 조금 짧게
        */

        const weights =
            chunks.map(chunk=>

                Math.max(
                    3,
                    chunk
                        .replace(
                            /\\N/g,
                            ""
                        )
                        .replace(
                            /\s/g,
                            ""
                        )
                        .length
                )

            );


        const totalWeight =
            weights.reduce(
                (sum,value)=>
                    sum + value,
                0
            );


        let localCurrent =
            current;


        for(
            let j=0;
            j<chunks.length;
            j++
        ){

            const isLast =
                j ===
                chunks.length - 1;


            const chunkDuration =
                isLast

                    ? (
                        current +
                        finalDuration -
                        localCurrent
                    )

                    : (
                        finalDuration *
                        (
                            weights[j] /
                            totalWeight
                        )
                    );


            const start =
                localCurrent;


            /*
            다음 자막과 절대 겹치지 않게
            마지막 0.02초 여백.

            너무 짧은 자막에서는 여백을 줄인다.
            */

            const gap =
                Math.min(
                    0.02,
                    Math.max(
                        0,
                        chunkDuration * 0.03
                    )
                );


            const end =
                Math.max(
                    start + 0.05,
                    start +
                    chunkDuration -
                    gap
                );


            const safeChunk =
                style === "CTA"
                    ? makeCTASafeLine(
                        chunks[j]
                    )
                    : chunks[j];

            const textLine =
                highlight(
                    safeChunk
                );


            const override =
                getOverride(
                    style
                );


            /*
            =====================================================
            2-LINE VISUAL POSITION COMPENSATION

            ASS Alignment 2는 하단 기준 정렬이므로
            2줄 자막은 1줄 자막보다 시각적 중심이 위로 올라간다.

            기본 Style MarginV = 610
            2줄 Dialogue만 MarginV = 565 로 보정하여
            시각적 중심을 아래로 약 45px 이동한다.

            1줄 자막 / CTA / Hook 위치는 변경하지 않는다.
            =====================================================
            */

            const dialogueMarginV =
                safeChunk.includes("\\N")
                    ? 565
                    : 0;

            events +=
`Dialogue: 0,${assTime(start)},${assTime(end)},${style},,0,0,${dialogueMarginV},,${override}${textLine}
`;


            /*
            다음 자막 시작점은
            실제 chunk 끝.

            이전 Dialogue의 end보다
            같거나 뒤에 있으므로 겹치지 않는다.
            */

            localCurrent +=
                chunkDuration;

        }


        /*
        다음 음성 시작점
        */

        current +=
            finalDuration;

    }


    fs.writeFileSync(
        output,
        header + events,
        "utf8"
    );


    success(
        "SUBTITLE COMPLETE"
    );


    debug(
        `SUBTITLE EVENTS ${
            events
                .split("\n")
                .filter(
                    x=>
                        x.startsWith(
                            "Dialogue:"
                        )
                )
                .length
        }`
    );


    debug(
        `SUBTITLE TIME ${
            current.toFixed(2)
        } sec`
    );


    return {
        file:output
    };

}
