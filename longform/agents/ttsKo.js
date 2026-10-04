import { DATA_ROOT } from "../config/paths.js";
import fs from "fs";
import { execFileSync } from "child_process";
import path from "path";

const input = `${DATA_ROOT}/longform-script.json`;
const outDir = `${DATA_ROOT}/tts-ko`;

fs.mkdirSync(outDir, { recursive: true });

let raw = fs.readFileSync(input, "utf8").replace(/^\uFEFF/, "");
const data = JSON.parse(raw);

console.log(`CHAPTERS: ${data.chapters.length}`);

for (const chapter of data.chapters) {
  const num = String(chapter.number).padStart(2, "0");
  const output = path.join(outDir, `${num}.mp3`);

  console.log(`TTS ${num}: ${chapter.title}`);

  execFileSync("edge-tts", [
    "--voice", "ko-KR-SunHiNeural",
    "--rate=+0%",
    "--text", chapter.narration,
    "--write-media", output
  ], { stdio: "inherit" });
}

console.log("KO LONGFORM TTS COMPLETE");
console.log(outDir);
