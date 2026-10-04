import fs from "fs";
import path from "path";
import { execSync } from "child_process";

import { VIDEO_DIR } from "./directory.js";

function selectRandomBGM(channel = "") {

    const channelName =
        String(channel || "")
            .trim()
            .toLowerCase();

    if (!channelName) {
        return null;
    }

    const bgmDir =
        path.resolve(
            "media",
            "bgm",
            channelName
        );

    if (!fs.existsSync(bgmDir)) {
        console.log(
            `[BGM] 폴더 없음 : ${bgmDir}`
        );

        return null;
    }

    const files =
        fs.readdirSync(
            bgmDir
        )
        .filter(
            file =>
                /\.(mp3|wav|m4a)$/i.test(file)
        );

    if (files.length === 0) {

        console.log(
            `[BGM] 파일 없음 : ${bgmDir}`
        );

        return null;
    }

    const selected =
        files[
            Math.floor(
                Math.random() * files.length
            )
        ];

    const bgm =
        path.join(
            bgmDir,
            selected
        );

    console.log(
        `[BGM] 채널 : ${channelName}`
    );

    console.log(
        `[BGM] 선택 : ${selected}`
    );

    return bgm;
}


export function renderVideo(
    merged,
    audio,
    channel = ""
){

    const mixedAudio =
        path.join(
            VIDEO_DIR,
            "shorts_mixed_audio.m4a"
        );

    const speedVideo =
        path.join(
            VIDEO_DIR,
            "shorts_speed.mp4"
        );

    const finalVideo =
        path.join(
            VIDEO_DIR,
            "shorts_voice.mp4"
        );


    /*
    =====================================================
    BGM 선택
    =====================================================
    */

    const bgm =
        selectRandomBGM(
            channel
        );


    /*
    =====================================================
    VOICE + BGM MIX
    BGM = 8%
    =====================================================
    */

    if (bgm) {

        console.log(
            "[BGM] 믹싱 시작 : 50%"
        );

        execSync(

`ffmpeg -y \
-i "${audio}" \
-stream_loop -1 \
-i "${bgm}" \
-filter_complex "[1:a]volume=0.50[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2:normalize=0,alimiter=limit=0.95[a]" \
-map "[a]" \
-c:a aac \
-b:a 192k \
-shortest \
"${mixedAudio}"`,

            {
                stdio: "ignore"
            }

        );

        console.log(
            "[BGM] 믹싱 완료"
        );

    }

    else {

        console.log(
            "[BGM] 사용 가능한 BGM 없음"
        );

        fs.copyFileSync(
            audio,
            mixedAudio
        );

    }


    /*
    =====================================================
    VIDEO + MIXED AUDIO
    =====================================================
    */

    execSync(

`ffmpeg -y \
-i "${merged}" \
-i "${mixedAudio}" \
-map 0:v \
-map 1:a \
-c:v libx264 \
-c:a aac \
-shortest \
"${finalVideo}"`,

        {
            stdio: "ignore"
        }

    );


    /*
    =====================================================
    기존 1.10배속
    =====================================================
    */

    execSync(

`ffmpeg -y \
-i "${finalVideo}" \
-filter_complex "[0:v]setpts=PTS/1.10[v];[0:a]atempo=1.10[a]" \
-map "[v]" \
-map "[a]" \
-c:v libx264 \
-preset veryfast \
-pix_fmt yuv420p \
-c:a aac \
-shortest \
"${speedVideo}"`,

        {
            stdio: "ignore"
        }

    );


    /*
    =====================================================
    기존 자막
    =====================================================
    */

    const subtitle =
        "media/subtitle/shorts.ass";

    const output =
        path.join(
            VIDEO_DIR,
            "shorts_final.mp4"
        );


    const channelName = String(channel || "").trim().toLowerCase();
    const isHotdealVideo = channelName === "shopping";

    // HOTDEAL은 카드 자체에 가격/비교정보가 있으므로
    // 하단 ASS 자막을 덮지 않는다. 일반 쇼츠 자막은 기존 그대로 유지.
    if (
        !isHotdealVideo &&
        fs.existsSync(
            subtitle
        )
    ) {

        execSync(

`ffmpeg -y \
-i "${speedVideo}" \
-vf "ass=${subtitle}" \
-c:a copy \
"${output}"`,

            {
                stdio: "ignore"
            }

        );

    }

    else {

        fs.copyFileSync(
            speedVideo,
            output
        );

    }


    return output;

}
