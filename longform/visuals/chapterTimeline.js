import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const ROOT = "./longform";
const SCRIPT = `${ROOT}/data/longform-script.json`;
const AUDIO_DIR = `${ROOT}/data/subtitles-ko`;
const OUTPUT = `${ROOT}/data/visuals/chapter-timeline-ko.json`;

const data = JSON.parse(
    fs.readFileSync(SCRIPT, "utf8").replace(/^\uFEFF/, "")
);

function duration(file) {
    return Number(
        execFileSync(
            "ffprobe",
            [
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                file
            ],
            { encoding: "utf8" }
        ).trim()
    );
}

let cursor = 0;

const chapters = data.chapters.map((chapter, i) => {
    const num = String(i + 1).padStart(2, "0");
    const audio = path.join(AUDIO_DIR, `${num}.mp3`);
    const seconds = duration(audio);

    const item = {
        number: i + 1,
        title:
            chapter.titleKo ??
            chapter.title ??
            `Chapter ${i + 1}`,

        start: Number(cursor.toFixed(3)),
        end: Number((cursor + seconds).toFixed(3)),
        duration: Number(seconds.toFixed(3))
    };

    cursor += seconds;
    return item;
});

const output = {
    createdAt: new Date().toISOString(),
    totalDuration: Number(cursor.toFixed(3)),
    chapters
};

fs.writeFileSync(
    OUTPUT,
    JSON.stringify(output, null, 2),
    "utf8"
);

for (const c of chapters) {
    console.log(
        `${String(c.number).padStart(2,"0")} | ${c.start.toFixed(1)} → ${c.end.toFixed(1)} | ${c.title}`
    );
}

console.log("");
console.log(`TOTAL=${(cursor / 60).toFixed(2)} min`);
console.log(`SAVED=${OUTPUT}`);
