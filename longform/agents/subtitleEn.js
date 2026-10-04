import { DATA_ROOT } from "../config/paths.js";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkSubtitles } from "../visuals/renderLongform.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VOICE = "en-US-ChristopherNeural";
const RATE = "+0%";

function command(program, args) {
    const result = spawnSync(program, args, { encoding: "utf8", windowsHide: true, timeout: 600000 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${program} failed (exit ${result.status}): ${result.stderr?.slice(-1200)}`);
    return result.stdout;
}

function durationMs(file) {
    const seconds = Number(command("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file]).trim());
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error("Invalid audio duration");
    return Math.round(seconds * 1000);
}

function parseTime(text) {
    if (!/^\d{2,}:\d{2}:\d{2},\d{3}$/.test(text)) throw new Error("Invalid SRT timestamp");
    const [h, m, s, ms] = text.split(/[:,]/).map(Number);
    return h * 3600000 + m * 60000 + s * 1000 + ms;
}

export function parseSrt(text) {
    return text.replace(/^\uFEFF/, "").replace(/\r/g, "").trim().split(/\n\s*\n/).map(block => {
        const lines = block.split("\n");
        const index = lines.findIndex(line => line.includes("-->"));
        if (index < 0) throw new Error("SRT cue has no timing");
        const [start, end] = lines[index].split("-->").map(value => parseTime(value.trim()));
        const value = lines.slice(index + 1).join(" ").trim();
        if (!value || end <= start) throw new Error("Invalid SRT cue");
        return { start, end, text: value };
    });
}

function chunks(text, maxChars = 40) {
    const result = [];
    let current = "";
    for (const word of text.split(/\s+/)) {
        const next = current ? `${current} ${word}` : word;
        if (current && next.length > maxChars) { result.push(current); current = word; }
        else current = next;
    }
    if (current) result.push(current);
    return result;
}

export function normalizeCues(raw, audioDurationMs) {
    const cues = [];
    for (const [index, cue] of raw.entries()) {
        // Keep a 20ms gap so libass cannot stack adjacent or overlapping cues.
        const nextStart = raw[index + 1]?.start;
        const end = Math.min(cue.end, nextStart === undefined ? Infinity : nextStart - 20, audioDurationMs);
        const parts = chunks(cue.text);
        const weight = parts.reduce((sum, text) => sum + text.length, 0);
        let cursor = cue.start;
        let consumed = 0;
        for (const [partIndex, text] of parts.entries()) {
            consumed += text.length;
            const boundary = partIndex === parts.length - 1 ? end : Math.round(cue.start + (end - cue.start) * consumed / weight);
            const cueEnd = partIndex === parts.length - 1 ? boundary : boundary - 20;
            if (cueEnd <= cursor) throw new Error("Subtitle timing too short; manual alignment needed");
            cues.push({ start: cursor, end: cueEnd, text });
            cursor = boundary;
        }
    }
    return cues;
}

function formatTime(ms) {
    const value = Math.round(ms);
    return `${String(Math.floor(value / 3600000)).padStart(2, "0")}:${String(Math.floor(value / 60000) % 60).padStart(2, "0")}:${String(Math.floor(value / 1000) % 60).padStart(2, "0")},${String(value % 1000).padStart(3, "0")}`;
}

export function makeSrt(cues) {
    return cues.map((cue, index) => `${index + 1}\n${formatTime(cue.start)} --> ${formatTime(cue.end)}\n${cue.text}\n`).join("\n");
}

export function restoreSourceText(cues, narration) {
    const words = narration.trim().split(/\s+/);
    const key = word => word.replace(/[\p{P}\p{S}]/gu, "");
    let cursor = 0;
    const result = cues.map(cue => {
        const spoken = cue.text.split(/\s+/);
        const original = words.slice(cursor, cursor + spoken.length);
        if (original.length !== spoken.length || spoken.some((word, index) => key(word) !== key(original[index]))) {
            throw new Error(`Edge subtitle differs from the script near word ${cursor + 1}`);
        }
        cursor += spoken.length;
        return { ...cue, text: original.join(" ") };
    });
    if (cursor !== words.length) throw new Error("Edge subtitles omitted script words");
    return result;
}

function main() {
    const source = path.join(DATA_ROOT, "longform-script.json");
    const sourceBytes = fs.readFileSync(source);
    const script = JSON.parse(sourceBytes.toString("utf8").replace(/^\uFEFF/, ""));
    if (script.chapters?.length !== 8 || script.chapters.some((chapter, index) => Number(chapter.number) !== index + 1 || !chapter.narrationEn?.trim())) throw new Error("Expected 8 existing English chapters");
    const parent = path.join(DATA_ROOT, "speech-runs");
    fs.mkdirSync(parent, { recursive: true });
    const runDir = fs.mkdtempSync(path.join(parent, "en-"));
    const manifest = { language: "en", voice: VOICE, rate: RATE, source,
        sourceSha256: crypto.createHash("sha256").update(sourceBytes).digest("hex"), chapters: [] };
    const all = [];
    let offset = 0;
    console.log(`RUN_DIR=${runDir}`);
    for (const chapter of script.chapters) {
        const number = String(chapter.number).padStart(2, "0");
        const textFile = path.join(runDir, `${number}.txt`);
        const audio = path.join(runDir, `${number}.mp3`);
        const rawFile = path.join(runDir, `${number}-raw.srt`);
        const subtitle = path.join(runDir, `${number}.srt`);
        fs.writeFileSync(textFile, chapter.narrationEn, { encoding: "utf8", flag: "wx" });
        console.log(`EDGE_TTS_SUBTITLES ${number}/08 VOICE=${VOICE} RATE=${RATE}`);
        command("edge-tts", ["--voice", VOICE, `--rate=${RATE}`, "--file", textFile, "--write-media", audio, "--write-subtitles", rawFile]);
        const ms = durationMs(audio);
        const cues = normalizeCues(restoreSourceText(parseSrt(fs.readFileSync(rawFile, "utf8")), chapter.narrationEn), ms);
        const srt = makeSrt(cues);
        checkSubtitles(srt, ms / 1000);
        fs.writeFileSync(subtitle, srt, { encoding: "utf8", flag: "wx" });
        manifest.chapters.push({
            number: chapter.number,
            audio,
            subtitle,
            duration: ms / 1000,
            cues: cues.length
        });
        all.push(...cues.map(cue => ({ ...cue, start: cue.start + offset, end: cue.end + offset })));
        offset += ms;
        console.log(`CHAPTER=${number} DURATION=${ms / 1000} CUES=${cues.length}`);
    }
    manifest.subtitle = path.join(runDir, "longform-en-fixed.srt");
    manifest.duration = offset / 1000;
    const merged = makeSrt(all);
    manifest.cues = checkSubtitles(merged, manifest.duration);
    fs.writeFileSync(manifest.subtitle, merged, { encoding: "utf8", flag: "wx" });
    const output = path.join(runDir, "speech-manifest.json");
    fs.writeFileSync(output, JSON.stringify(manifest, null, 2), { encoding: "utf8", flag: "wx" });
    console.log(`SPEECH_COMPLETE=${output} DURATION=${manifest.duration} CUES=${manifest.cues}`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
    try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
