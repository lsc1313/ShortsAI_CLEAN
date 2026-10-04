import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { callAI } from "../../modules/ai/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "data", "longform-script.json");
const OUTPUT = path.join(ROOT, "data", "longform-script-en.json");

function readJSON(file) {
    return JSON.parse(
        fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")
    );
}

function cleanText(text = "") {
    return String(text)
        .replace(/```(?:text|markdown)?/gi, "")
        .replace(/```/g, "")
        .replace(/\[\s*\d+(?:\.\d+)?(?:\s*,\s*\d+(?:\.\d+)?)*\s*\]/g, "")
        .trim();
}

function wordCount(text = "") {
    return String(text)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .length;
}

async function translateChapter(topic, chapter) {

    const prompt = `
Translate and adapt the following Korean documentary narration
into natural spoken American English for a YouTube long-form
history documentary.

Overall topic:
${topic}

Chapter:
${chapter.number}. ${chapter.title}

KOREAN NARRATION:
${chapter.narration}

Rules:
- Preserve every factual claim and meaning from the Korean narration.
- Do not invent or add facts.
- Do not remove important information.
- Do not add citations or source numbers.
- Do not translate mechanically word-for-word.
- Write natural documentary narration for an English-speaking audience.
- It must sound natural when spoken by TTS.
- Prefer clear spoken sentences over academic prose.
- Preserve suspense and storytelling where appropriate.
- Do not include production directions.
- Do not include a chapter heading.
- Output only the English narration.
`;

    return cleanText(await callAI(prompt));
}

async function main() {

    const data = readJSON(INPUT);
    const completed = [];

    console.log("");
    console.log("================================");
    console.log("LONGFORM ENGLISH WRITER");
    console.log("================================");
    console.log(`CHAPTERS: ${data.chapters.length}`);

    for (const chapter of data.chapters) {

        console.log("");
        console.log(
            `[${chapter.number}/${data.chapters.length}] ${chapter.title}`
        );

        const narrationEn = await translateChapter(
            data.topic,
            chapter
        );

        const words = wordCount(narrationEn);

        completed.push({
            number: chapter.number,
            titleKo: chapter.title,
            narrationEn,
            words
        });

        console.log(`WORDS=${words}`);
    }

    const scriptEn = completed
        .map(chapter => chapter.narrationEn)
        .join("\n\n");

    const totalWords = wordCount(scriptEn);

    const output = {
        createdAt: new Date().toISOString(),
        topicKo: data.topic,
        source: "longform-script.json",
        aiCalls: completed.length,
        chapters: completed,
        scriptEn,
        totalWords
    };

    fs.writeFileSync(
        OUTPUT,
        JSON.stringify(output, null, 2),
        "utf8"
    );

    console.log("");
    console.log("================================");
    console.log("ENGLISH SCRIPT COMPLETE");
    console.log("================================");
    console.log(`TOTAL WORDS=${totalWords}`);
    console.log(`AI CALLS=${output.aiCalls}`);
    console.log(`SAVED: ${OUTPUT}`);
}

main().catch(error => {
    console.error("ENGLISH WRITER FAILED:", error.message);
    process.exit(1);
});
