import { DATA_ROOT } from "../config/paths.js";
import fs from "fs";
import { execFileSync } from "child_process";
import path from "path";

const input = `${DATA_ROOT}/longform-script-en.json`;
const outDir = `${DATA_ROOT}/tts-en`;

fs.mkdirSync(outDir, { recursive: true });

const data = JSON.parse(
    fs.readFileSync(input, "utf8").replace(/^\uFEFF/, "")
);

console.log(`CHAPTERS: ${data.chapters.length}`);

for (const chapter of data.chapters) {
    const num = String(chapter.number).padStart(2, "0");
    const output = path.join(outDir, `${num}.mp3`);

    console.log(`TTS ${num}`);

    execFileSync("edge-tts", [
        "--voice", "en-US-ChristopherNeural",
        "--rate=+0%",
        "--text", chapter.narrationEn,
        "--write-media", output
    ], { stdio: "inherit" });
}

console.log("EN LONGFORM TTS COMPLETE");
console.log(outDir);
