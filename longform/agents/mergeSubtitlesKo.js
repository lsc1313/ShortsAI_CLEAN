import { DATA_ROOT } from "../config/paths.js";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const DIR = `${DATA_ROOT}/subtitles-ko`;
const OUTPUT = path.join(DIR, "longform-ko.srt");

function timeToMs(t) {
    const m = t.match(/(\d+):(\d+):(\d+),(\d+)/);
    return (
        Number(m[1]) * 3600000 +
        Number(m[2]) * 60000 +
        Number(m[3]) * 1000 +
        Number(m[4])
    );
}

function msToTime(ms) {
    ms = Math.round(ms);

    const h = Math.floor(ms / 3600000);
    ms %= 3600000;

    const m = Math.floor(ms / 60000);
    ms %= 60000;

    const s = Math.floor(ms / 1000);
    const x = ms % 1000;

    return (
        String(h).padStart(2, "0") + ":" +
        String(m).padStart(2, "0") + ":" +
        String(s).padStart(2, "0") + "," +
        String(x).padStart(3, "0")
    );
}

function parseSRT(text) {
    return text
        .replace(/\r/g, "")
        .trim()
        .split(/\n\s*\n/)
        .map(block => {
            const lines = block.split("\n");
            const timing = lines.find(x => x.includes("-->"));
            if (!timing) return null;

            const [start, end] =
                timing.split("-->").map(x => x.trim());

            const idx = lines.indexOf(timing);

            return {
                start: timeToMs(start),
                end: timeToMs(end),
                text: lines.slice(idx + 1).join("\n").trim()
            };
        })
        .filter(Boolean);
}

function durationMs(file) {
    const result = execFileSync(
        "ffprobe",
        [
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file
        ],
        { encoding: "utf8" }
    );

    return Math.round(Number(result.trim()) * 1000);
}

let offset = 0;
let all = [];

for (let i = 1; i <= 8; i++) {

    const num = String(i).padStart(2, "0");

    const srt = path.join(DIR, `${num}.srt`);
    const mp3 = path.join(DIR, `${num}.mp3`);

    const cues = parseSRT(
        fs.readFileSync(srt, "utf8")
    );

    for (const cue of cues) {
        all.push({
            start: cue.start + offset,
            end: cue.end + offset,
            text: cue.text
        });
    }

    const duration = durationMs(mp3);

    console.log(
        `${num}: ${(duration / 1000).toFixed(1)} sec`
    );

    offset += duration;
}

const output = all.map((cue, i) => [
    i + 1,
    `${msToTime(cue.start)} --> ${msToTime(cue.end)}`,
    cue.text,
    ""
].join("\n")).join("\n");

fs.writeFileSync(OUTPUT, output, "utf8");

console.log("");
console.log("MERGED SUBTITLE COMPLETE");
console.log(`CUES=${all.length}`);
console.log(`DURATION=${(offset / 60000).toFixed(2)} min`);
console.log(`SAVED=${OUTPUT}`);
