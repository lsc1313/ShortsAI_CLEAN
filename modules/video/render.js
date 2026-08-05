import fs from "fs";
import path from "path";
import { execSync } from "child_process";

import { VIDEO_DIR } from "./directory.js";

export function renderVideo(
    merged,
    audio
){

    const speedVideo = path.join(
        VIDEO_DIR,
        "shorts_speed.mp4"
    );

    const finalVideo = path.join(
        VIDEO_DIR,
        "shorts_voice.mp4"
    );

    execSync(

`ffmpeg -y \
-i "${merged}" \
-i "${audio}" \
-map 0:v \
-map 1:a \
-c:v libx264 \
-c:a aac \
-shortest \
"${finalVideo}"`,

{
    stdio:"ignore"
}

    );

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
    stdio:"ignore"
}

    );

    const subtitle = "media/subtitle/shorts.ass";

    const output = path.join(
        VIDEO_DIR,
        "shorts_final.mp4"
    );

    if(fs.existsSync(subtitle)){

        execSync(

`ffmpeg -y \
-i "${speedVideo}" \
-vf "ass=${subtitle}" \
-c:a copy \
"${output}"`,

{
    stdio:"ignore"
}

        );

    }

    else{

        /*
        ASS가 없는 경우에도
        이미 1.10배속이 적용된 영상을 사용한다.

        finalVideo = 배속 전
        speedVideo = 영상/음성 1.10배속 완료
        */

        fs.copyFileSync(
            speedVideo,
            output
        );

    }

    return output;

}
