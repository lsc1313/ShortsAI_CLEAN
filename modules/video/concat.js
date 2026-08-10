import fs from "fs";
import path from "path";
import { execSync } from "child_process";

import { VIDEO_DIR } from "./directory.js";


function getDuration(file){

    const result =
        execSync(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`,
            {
                encoding: "utf8"
            }
        ).trim();

    const value =
        Number(result);

    if(
        !Number.isFinite(value) ||
        value <= 0
    ){
        throw new Error(
            `영상 길이를 확인할 수 없습니다: ${file}`
        );
    }

    return value;
}


function normalizeTransition(value){

    switch(
        String(value || "cut")
            .toLowerCase()
            .trim()
    ){

        case "fade":
            return "fade";

        case "flash":
            return "fadewhite";

        case "slide":
            return "slideleft";

        case "zoom":
            return "zoomin";

        case "cut":
        default:
            return null;
    }

}

export function concatVideo(files){

    const list =
        path.join(
            VIDEO_DIR,
            "video_list.txt"
        );

    fs.writeFileSync(

        list,

        files
            .map(
                f =>
                    `file '${path.resolve(f)}'`
            )
            .join("\n"),

        "utf8"

    );


    const output =
        path.join(
            VIDEO_DIR,
            "merged.mp4"
        );


    execSync(

`ffmpeg -y \
-hide_banner \
-loglevel error \
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

    const list =
        path.join(
            VIDEO_DIR,
            "audio_list.txt"
        );


    fs.writeFileSync(

        list,

        files
            .map(
                file =>
                    `file '${path.resolve(file)}'`
            )
            .join("\n"),

        "utf8"

    );


    const output =
        path.join(
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
