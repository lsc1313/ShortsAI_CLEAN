import { DATA_ROOT } from "../config/paths.js";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateImageResult } from "./runLongformImageEngine.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FPS = 25;
const readJSON = file => JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
function command(program, args, cwd) {
    const result = spawnSync(program, args, { cwd, encoding: "utf8", windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${program} failed: ${result.stderr?.slice(-4000)}`);
    return result.stdout;
}

function duration(file) {
    const value = Number(command("ffprobe", ["-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", file]).trim());
    if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid audio duration: ${file}`);
    return value;
}

export function buildTimeline(chapters, images, durations, language) {
    if (chapters.length !== 8 || durations.length !== 8 || !["ko", "en"].includes(language)) throw new Error("Invalid timeline inputs");
    let cursor = 0;
    const segments = [];
    for (let i = 0; i < chapters.length; i++) {
        const seconds = durations[i];
        if (!Number.isFinite(seconds) || seconds <= 0) throw new Error("Invalid chapter duration");
        const selected = images.filter(image => image.scene === i + 1);
        if (selected.length !== 2) throw new Error(`Chapter ${i + 1} needs two images`);
        const titleEn =
            String(chapters[i].titleEn || "").trim();

        if (language === "en" && !titleEn) {
            throw new Error(
                `Chapter ${i + 1} missing titleEn`
            );
        }
        for (let slot = 0; slot < 2; slot++) {
            const startFrame = Math.round((cursor + seconds * slot / 2) * FPS);
            const endFrame = Math.round((cursor + seconds * (slot + 1) / 2) * FPS);
            segments.push({ chapter: i + 1, slot: slot + 1, file: selected[slot].file,
                query: selected[slot].keyword, startFrame, endFrame, frames: endFrame - startFrame,
                start: startFrame / FPS, end: endFrame / FPS,
                title: language === "ko" ? (chapters[i].titleKo || chapters[i].title) : titleEn,
                subtitleTitle:
                    language === "ko"
                        ? (titleEn || "HISTORY DOCUMENTARY")
                        : "HISTORY DOCUMENTARY" });
        }
        cursor += seconds;
    }
    return { language, fps: FPS, totalDuration: cursor, totalFrames: segments.at(-1).endFrame, segments };
}

export function checkSubtitles(text, totalDuration) {
    const toSeconds = time => {
        const [h, m, s, ms] = time.split(/[:,]/).map(Number);
        return h * 3600 + m * 60 + s + ms / 1000;
    };
    const timings = [...text.matchAll(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/g)];
    if (!timings.length) throw new Error("No subtitle cues");
    let end = 0;
    for (const cue of timings) {
        const start = toSeconds(cue[1]);
        const nextEnd = toSeconds(cue[2]);
        if (start < end || nextEnd <= start || nextEnd > totalDuration + 0.1) throw new Error("Subtitle overlap or invalid timing");
        end = nextEnd;
    }
    return timings.length;
}

export function videoFilter(segment, index, withSubtitles) {
    const span = Math.max(1, segment.frames - 1);
    const titleSize = [...segment.title].length > 34 ? 48 : 64;
    return [
        "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1",
        `zoompan=z='1+0.06*on/${span}':x='(iw-iw/zoom)*(0.4+0.2*on/${span})':y='(ih-ih/zoom)/2':d=${segment.frames}:s=1920x1080:fps=${FPS}`,
        "eq=brightness=-0.03:contrast=0.98:saturation=0.92",
        "drawbox=x=0:y=35:w=iw:h=230:color=black@0.35:t=fill",
        `drawtext=fontfile=font.ttf:text='CHAPTER ${String(segment.chapter).padStart(2, "0")}':fontsize=34:fontcolor=0xD9B86C:x=(w-tw)/2:y=55`,
        `drawtext=fontfile=font-bold.ttf:textfile=title-${index}.txt:expansion=none:fontsize=${titleSize}:fontcolor=white:x=(w-tw)/2:y=105`,
        `drawtext=fontfile=font.ttf:textfile=small-${index}.txt:expansion=none:fontsize=25:fontcolor=0xD9B86C:x=(w-tw)/2:y=190`,
        "drawbox=x=160:y=232:w=1600:h=2:color=0xD9B86C:t=fill",
        ...(withSubtitles ? [`setpts=PTS+${segment.start}/TB`,
            "subtitles=subtitle.srt:force_style='FontName=Malgun Gothic,FontSize=30,PrimaryColour=&H00FFFFFF,Outline=4,Shadow=1,Alignment=2,MarginV=55,BorderStyle=1'",
            "setpts=PTS-STARTPTS"] : []), "format=yuv420p"
    ].join(",");
}


function main() {

    const [
        manifestArg,
        language = "ko",
        mode = "preview",
        speechManifestArg,
        runKeyArg
    ] = process.argv.slice(2);


    if (
        !manifestArg ||
        !["ko", "en"].includes(language) ||
        !["preview", "full", "plan"].includes(mode)
    ) {
        throw new Error(
            "Usage: renderLongform.js <image-result.json> ko|en preview|full|plan [speech-manifest] [run-key]"
        );
    }


    const imageResult =
        readJSON(
            path.resolve(manifestArg)
        );

    validateImageResult(
        imageResult
    );


    const script =
        readJSON(
            path.join(
                DATA_ROOT,
                "longform-script.json"
            )
        );


    const audioDir =
        path.join(
            DATA_ROOT,
            language === "ko"
                ? "subtitles-ko"
                : "tts-en"
        );


    const speech =
        speechManifestArg
            ? readJSON(
                path.resolve(
                    speechManifestArg
                )
            )
            : null;


    if (
        speech &&
        (
            speech.language !== language ||
            speech.chapters?.length !== 8 ||
            speech.chapters.some(
                (chapter, index) =>
                    chapter.number !== index + 1 ||
                    !fs.existsSync(
                        chapter.audio
                    )
            )
        )
    ) {
        throw new Error(
            "Invalid paired speech manifest"
        );
    }


    const audioFiles =
        speech
            ? speech.chapters.map(
                chapter =>
                    chapter.audio
            )
            : script.chapters.map(
                (_, i) =>
                    path.join(
                        audioDir,
                        `${String(i + 1).padStart(2, "0")}.mp3`
                    )
            );


    for (const file of audioFiles) {

        if (!fs.existsSync(file)) {
            throw new Error(
                `Missing audio: ${file}`
            );
        }

    }


    const plan =
        buildTimeline(
            script.chapters,
            imageResult.images,
            audioFiles.map(duration),
            language
        );


    /*
    =====================================================
    deterministic run directory

    같은 production ID는 항상 같은 폴더를 사용한다.
    PC 종료 / 오류 후 다시 실행하면 여기서 이어간다.
    =====================================================
    */

    const rawRunKey =
        String(
            runKeyArg ||
            script.createdAt ||
            "manual"
        );

    const runKey =
        rawRunKey
            .replace(
                /[^a-zA-Z0-9_-]/g,
                "-"
            )
            .slice(0, 80);


    const runs =
        path.join(
            DATA_ROOT,
            "visuals",
            "render-runs"
        );

    fs.mkdirSync(
        runs,
        {
            recursive: true
        }
    );


    const runDir =
        path.join(
            runs,
            `job-${runKey}-${language}-${mode}`
        );

    fs.mkdirSync(
        runDir,
        {
            recursive: true
        }
    );


    fs.writeFileSync(
        path.join(
            runDir,
            "timeline.json"
        ),
        JSON.stringify(
            plan,
            null,
            2
        )
    );


    console.log(
        `RUN_DIR=${runDir}`
    );

    console.log(
        `DURATION=${plan.totalDuration.toFixed(3)} SEGMENTS=${plan.segments.length}`
    );


    if (mode === "plan") {
        return;
    }


    let subtitleFile =
        speech?.subtitle ||
        path.join(
            DATA_ROOT,
            `subtitles-${language}`,
            `longform-${language}-fixed.srt`
        );

    if (
        !speech &&
        language === "ko" &&
        !fs.existsSync(subtitleFile)
    ) {
        const koFallback = path.join(
            DATA_ROOT,
            "subtitles-ko",
            "longform-ko.srt"
        );

        if (fs.existsSync(koFallback)) {
            subtitleFile = koFallback;
            console.log(
                `[KO SUBTITLE FALLBACK] ${subtitleFile}`
            );
        }
    }


    if (
        !fs.existsSync(
            subtitleFile
        )
    ) {
        throw new Error(
            `Existing aligned subtitles required: ${subtitleFile}. TTS regeneration is disabled.`
        );
    }


    const subtitles =
        fs.readFileSync(
            subtitleFile,
            "utf8"
        );


    console.log(
        `SUBTITLE_CUES=${checkSubtitles(
            subtitles,
            plan.totalDuration
        )}`
    );


    fs.writeFileSync(
        path.join(
            runDir,
            "subtitle.srt"
        ),
        subtitles
    );


    fs.copyFileSync(
        "C:/Windows/Fonts/malgun.ttf",
        path.join(
            runDir,
            "font.ttf"
        )
    );

    fs.copyFileSync(
        "C:/Windows/Fonts/malgunbd.ttf",
        path.join(
            runDir,
            "font-bold.ttf"
        )
    );


    fs.writeFileSync(
        path.join(
            runDir,
            "audio.txt"
        ),
        audioFiles
            .map(
                file =>
                    `file '${file
                        .replace(/\\/g, "/")
                        .replace(/'/g, "'\\\\''")}'`
            )
            .join("\n")
    );


    const segments =
        mode === "preview"
            ? plan.segments.slice(0, 1)
            : plan.segments;


    function validMedia(
        file,
        expected,
        tolerance = 0.25
    ) {

        if (
            !fs.existsSync(
                file
            )
        ) {
            return false;
        }

        try {

            const actual =
                duration(file);

            return (
                Math.abs(
                    actual -
                    expected
                ) <= tolerance
            );

        }
        catch {

            return false;

        }

    }


    /*
    =====================================================
    SEGMENT RESUME

    이미 정상 완성된 segment-N.mp4는 SKIP.
    깨진 파일만 삭제 후 다시 렌더.
    =====================================================
    */

    for (
        const [index, segment]
        of segments.entries()
    ) {

        const segmentFile =
            path.join(
                runDir,
                `segment-${index}.mp4`
            );


        const frames =
            mode === "preview"
                ? FPS * 12
                : segment.frames;


        const expectedDuration =
            frames / FPS;


        fs.writeFileSync(
            path.join(
                runDir,
                `title-${index}.txt`
            ),
            segment.title
        );


        fs.writeFileSync(
            path.join(
                runDir,
                `small-${index}.txt`
            ),
            segment.subtitleTitle
        );


        if (
            validMedia(
                segmentFile,
                expectedDuration
            )
        ) {

            console.log(
                `RENDER SKIP ${index + 1}/${segments.length} CHAPTER=${segment.chapter} SLOT=${segment.slot}`
            );

            continue;

        }


        if (
            fs.existsSync(
                segmentFile
            )
        ) {
            fs.unlinkSync(
                segmentFile
            );
        }


        console.log(
            `RENDER ${index + 1}/${segments.length} CHAPTER=${segment.chapter} SLOT=${segment.slot}`
        );


        command(
            "ffmpeg",
            [
                "-hide_banner",
                "-loglevel",
                "error",
                "-n",

                "-i",
                segment.file,

                "-vf",
                videoFilter(
                    segment,
                    index,
                    true
                ),

                "-frames:v",
                String(frames),

                "-an",

                "-c:v",
                "libx264",

                "-preset",
                "ultrafast",

                "-crf",
                "21",

                "-threads",
                "4",

                `segment-${index}.mp4`
            ],
            runDir
        );


        if (
            !validMedia(
                segmentFile,
                expectedDuration
            )
        ) {
            throw new Error(
                `Segment validation failed: ${index}`
            );
        }

    }


    fs.writeFileSync(
        path.join(
            runDir,
            "video.txt"
        ),
        segments
            .map(
                (_, i) =>
                    `file 'segment-${i}.mp4'`
            )
            .join("\n")
    );


    const output =
        `longform-${language}-${mode}.mp4`;

    const outputPath =
        path.join(
            runDir,
            output
        );


    const expected =
        mode === "preview"
            ? 12
            : plan.totalDuration;


    /*
    최종 파일까지 이미 정상이라면
    concat도 다시 하지 않는다.
    */

    if (
        validMedia(
            outputPath,
            expected,
            0.15
        )
    ) {

        console.log(
            `FINAL RENDER SKIP=${outputPath}`
        );

        console.log(
            `RENDER_COMPLETE=${outputPath} DURATION=${duration(outputPath)}`
        );

        return;

    }


    if (
        fs.existsSync(
            outputPath
        )
    ) {
        fs.unlinkSync(
            outputPath
        );
    }


    command(
        "ffmpeg",
        [
            "-hide_banner",
            "-loglevel",
            "error",
            "-n",

            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            "video.txt",

            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            "audio.txt",

            "-map",
            "0:v:0",

            "-map",
            "1:a:0",

            "-c:v",
            "copy",

            "-c:a",
            "aac",

            "-b:a",
            "192k",

            "-t",
            String(expected),

            "-movflags",
            "+faststart",

            output
        ],
        runDir
    );


    const outputDuration =
        duration(
            outputPath
        );


    if (
        Math.abs(
            outputDuration -
            expected
        ) > 0.15
    ) {
        throw new Error(
            "Rendered duration mismatch"
        );
    }


    console.log(
        `RENDER_COMPLETE=${outputPath} DURATION=${outputDuration}`
    );

}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
    try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
