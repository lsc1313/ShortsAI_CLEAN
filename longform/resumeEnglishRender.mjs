import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { videoFilter } from "./visuals/renderLongform.js";

const ROOT = path.resolve("./longform");
const runDir = path.resolve(
    "./longform/data/visuals/render-runs/en-full-kowYqk"
);

const START_INDEX = 3;
const THREADS = 2;

function command(program, args, cwd) {
    const result = spawnSync(program, args, {
        cwd,
        encoding: "utf8",
        windowsHide: true,
        maxBuffer: 8 * 1024 * 1024
    });

    if (result.error) throw result.error;

    if (result.status !== 0) {
        throw new Error(
            `${program} failed:\n${result.stderr?.slice(-5000)}`
        );
    }

    return result.stdout;
}

function duration(file) {
    return Number(
        command(
            "ffprobe",
            [
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                file
            ],
            runDir
        ).trim()
    );
}

const timelineFile = path.join(runDir, "timeline.json");

if (!fs.existsSync(timelineFile)) {
    throw new Error("timeline.json not found");
}

const plan = JSON.parse(
    fs.readFileSync(timelineFile, "utf8").replace(/^\uFEFF/, "")
);

console.log("");
console.log("================================");
console.log("ENGLISH RENDER RESUME");
console.log("================================");
console.log(`RUN_DIR=${runDir}`);
console.log(`SEGMENTS=${plan.segments.length}`);
console.log(`START=${START_INDEX}`);
console.log(`THREADS=${THREADS}`);

for (let index = START_INDEX; index < plan.segments.length; index++) {

    const segment = plan.segments[index];

    const output = path.join(
        runDir,
        `segment-${index}.mp4`
    );

    if (
        fs.existsSync(output) &&
        fs.statSync(output).size > 100000
    ) {
        console.log(
            `SKIP ${index + 1}/${plan.segments.length} already exists`
        );
        continue;
    }

    fs.writeFileSync(
        path.join(runDir, `title-${index}.txt`),
        segment.title,
        "utf8"
    );

    fs.writeFileSync(
        path.join(runDir, `small-${index}.txt`),
        segment.subtitleTitle,
        "utf8"
    );

    console.log("");
    console.log(
        `RENDER ${index + 1}/${plan.segments.length} ` +
        `CHAPTER=${segment.chapter} SLOT=${segment.slot}`
    );

    command(
        "ffmpeg",
        [
            "-hide_banner",
            "-loglevel", "error",
            "-y",

            "-i", segment.file,

            "-vf", videoFilter(
                segment,
                index,
                true
            ),

            "-frames:v", String(segment.frames),
            "-an",

            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "21",
            "-threads", String(THREADS),

            `segment-${index}.mp4`
        ],
        runDir
    );

    console.log(
        `DONE segment-${index}.mp4`
    );
}

/* 모든 세그먼트 확인 */

for (let i = 0; i < plan.segments.length; i++) {

    const file = path.join(
        runDir,
        `segment-${i}.mp4`
    );

    if (!fs.existsSync(file)) {
        throw new Error(
            `Missing segment-${i}.mp4`
        );
    }
}

fs.writeFileSync(
    path.join(runDir, "video.txt"),
    plan.segments
        .map((_, i) => `file 'segment-${i}.mp4'`)
        .join("\n"),
    "ascii"
);

const finalFile =
    path.join(runDir, "longform-en-full.mp4");

if (fs.existsSync(finalFile)) {
    fs.unlinkSync(finalFile);
}

console.log("");
console.log("JOINING FINAL VIDEO...");

command(
    "ffmpeg",
    [
        "-hide_banner",
        "-loglevel", "error",
        "-y",

        "-f", "concat",
        "-safe", "0",
        "-i", "video.txt",

        "-f", "concat",
        "-safe", "0",
        "-i", "audio.txt",

        "-map", "0:v:0",
        "-map", "1:a:0",

        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",

        "-t", String(plan.totalDuration),

        "-movflags", "+faststart",

        "longform-en-full.mp4"
    ],
    runDir
);

const finalDuration = duration(finalFile);

console.log("");
console.log("================================");
console.log("ENGLISH RENDER COMPLETE");
console.log("================================");
console.log(`DURATION=${finalDuration.toFixed(3)}`);
console.log(`EXPECTED=${plan.totalDuration.toFixed(3)}`);
console.log(`FILE=${finalFile}`);
