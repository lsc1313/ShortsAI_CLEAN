import { DATA_ROOT } from "../config/paths.js";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(DATA_ROOT, "longform-script.json");
const OUT = path.join(DATA_ROOT, "subtitles-ko");

const VOICE = "ko-KR-SunHiNeural";
const RATE = "+0%";

fs.mkdirSync(OUT, { recursive: true });

function readJSON(file) {
    return JSON.parse(
        fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")
    );
}

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
    ms = Math.max(0, Math.round(ms));

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
                text: lines.slice(idx + 1).join(" ").trim()
            };
        })
        .filter(Boolean);
}

function splitText(text, maxChars = 22) {
    const words = text.split(/\s+/);
    const chunks = [];
    let current = "";

    for (const word of words) {
        const next = current ? `${current} ${word}` : word;

        if (next.length > maxChars && current) {
            chunks.push(current);
            current = word;
        } else {
            current = next;
        }
    }

    if (current) chunks.push(current);

    return chunks;
}

function splitCue(cue) {
    const chunks = splitText(cue.text);

    if (chunks.length <= 1) return [cue];

    const totalWeight = chunks.reduce(
        (sum, x) => sum + x.replace(/\s/g, "").length,
        0
    );

    const duration = cue.end - cue.start;
    let cursor = cue.start;

    return chunks.map((text, index) => {
        const weight = text.replace(/\s/g, "").length;

        const end =
            index === chunks.length - 1
                ? cue.end
                : cursor + duration * (weight / totalWeight);

        const result = {
            start: cursor,
            end,
            text
        };

        cursor = end;

        return result;
    });
}

function makeSRT(cues) {
    return cues.map((cue, i) => {
        return [
            i + 1,
            `${msToTime(cue.start)} --> ${msToTime(cue.end)}`,
            cue.text,
            ""
        ].join("\n");
    }).join("\n");
}

const data = readJSON(INPUT);

console.log(`CHAPTERS=${data.chapters.length}`);

for (const chapter of data.chapters) {

    const num = String(chapter.number).padStart(2, "0");

    const narration =
        chapter.narrationKo ??
        chapter.narration;

    const txt = path.join(OUT, `${num}.txt`);
    const mp3 = path.join(OUT, `${num}.mp3`);
    const rawSrt = path.join(OUT, `${num}-raw.srt`);
    const finalSrt = path.join(OUT, `${num}.srt`);

    fs.writeFileSync(txt, narration, "utf8");

    console.log(`TTS+SUB ${num}`);

    execFileSync("edge-tts", [
        "--voice", VOICE,
        `--rate=${RATE}`,
        "--file", txt,
        "--write-media", mp3,
        "--write-subtitles", rawSrt
    ], {
        stdio: "inherit"
    });

    const raw = fs.readFileSync(rawSrt, "utf8");
    const cues = parseSRT(raw);

    const finalCues = cues.flatMap(splitCue);

    fs.writeFileSync(
        finalSrt,
        makeSRT(finalCues),
        "utf8"
    );

    console.log(
        `RAW=${cues.length} FINAL=${finalCues.length}`
    );
}

console.log("");
console.log("KO SUBTITLE BUILD COMPLETE");
console.log(OUT);
