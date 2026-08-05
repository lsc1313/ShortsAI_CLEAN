import fs from "fs";
import path from "path";
import { execSync } from "child_process";

import { VIDEO_DIR } from "./directory.js";

export function concatVideo(files){

    const list = path.join(
        VIDEO_DIR,
        "video_list.txt"
    );

    fs.writeFileSync(

        list,

        files
            .map(
                f=>`file '${path.resolve(f)}'`
            )
            .join("\n")

    );

    const output = path.join(
        VIDEO_DIR,
        "merged.mp4"
    );

    execSync(

`ffmpeg -y \
-f concat \
-safe 0 \
-i "${list}" \
-c copy \
"${output}"`,

{
stdio:"ignore"
}

    );

    return output;

}

export function concatAudio(files){

    const list = path.join(
        VIDEO_DIR,
        "audio_list.txt"
    );

    fs.writeFileSync(

        list,

        files
            .map(
                f=>`file '${path.resolve(f)}'`
            )
            .join("\n")

    );

    const output = path.join(
        VIDEO_DIR,
        "voice_all.mp3"
    );

    execSync(

`ffmpeg -y \
-f concat \
-safe 0 \
-i "${list}" \
-c copy \
"${output}"`,

{
stdio:"ignore"
}

    );

    return output;

}
