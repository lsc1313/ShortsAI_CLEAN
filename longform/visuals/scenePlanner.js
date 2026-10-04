import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "data", "longform-script.json");
const OUTPUT = path.join(ROOT, "data", "visuals", "scene-plan-base.json");

const TARGET_CHARS = 220;
const MIN_CHARS = 130;

function readJSON(file) {
    return JSON.parse(
        fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")
    );
}

function splitSentences(text = "") {
    return String(text)
        .replace(/\s+/g, " ")
        .trim()
        .split(/(?<=[.!?。！？])\s+/)
        .filter(Boolean);
}

function makeScenes(text) {
    const sentences = splitSentences(text);
    const scenes = [];

    let buffer = "";

    for (const sentence of sentences) {
        const next = buffer
            ? `${buffer} ${sentence}`
            : sentence;

        if (
            buffer &&
            buffer.length >= MIN_CHARS &&
            next.length > TARGET_CHARS
        ) {
            scenes.push(buffer.trim());
            buffer = sentence;
        } else {
            buffer = next;
        }
    }

    if (buffer.trim()) {
        if (
            scenes.length &&
            buffer.length < MIN_CHARS
        ) {
            scenes[scenes.length - 1] += ` ${buffer.trim()}`;
        } else {
            scenes.push(buffer.trim());
        }
    }

    return scenes;
}

function main() {
    const data = readJSON(INPUT);

    const chapters = data.chapters.map((chapter, chapterIndex) => {
        const narration =
            chapter.narrationKo ??
            chapter.narration ??
            "";

        const parts = makeScenes(narration);

        return {
            chapter: chapter.number ?? chapterIndex + 1,
            title:
                chapter.titleKo ??
                chapter.title ??
                `Chapter ${chapterIndex + 1}`,

            scenes: parts.map((text, index) => ({
                id: `C${String(chapterIndex + 1).padStart(2, "0")}-S${String(index + 1).padStart(2, "0")}`,
                textKo: text
            }))
        };
    });

    const totalScenes = chapters.reduce(
        (sum, chapter) => sum + chapter.scenes.length,
        0
    );

    const output = {
        createdAt: new Date().toISOString(),
        topic: data.topic,
        targetCharsPerScene: TARGET_CHARS,
        totalChapters: chapters.length,
        totalScenes,
        chapters
    };

    fs.mkdirSync(path.dirname(OUTPUT), {
        recursive: true
    });

    fs.writeFileSync(
        OUTPUT,
        JSON.stringify(output, null, 2),
        "utf8"
    );

    console.log("");
    console.log("SCENE PLAN BASE COMPLETE");
    console.log(`CHAPTERS=${chapters.length}`);
    console.log(`SCENES=${totalScenes}`);
    console.log(`SAVED=${OUTPUT}`);
}

main();
