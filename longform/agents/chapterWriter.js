import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { callAI } from "../../modules/ai/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "data", "production-research.json");
const OUTPUT = path.join(ROOT, "data", "longform-script.json");

const CHAPTER_COUNT = 8;
const MIN_KO_CHARS = 1300;
const MIN_TOTAL_KO_CHARS = 10000;

function readJSON(file) {
    return JSON.parse(
        fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")
    );
}

function cleanText(text = "") {
    return String(text)
        .replace(/```(?:json|text|markdown)?/gi, "")
        .replace(/```/g, "")
        .replace(/\[\s*\d+(?:\.\d+)?(?:\s*,\s*\d+(?:\.\d+)?)*\s*\]/g, "")
        .trim();
}

function charCount(text = "") {
    return String(text).replace(/\s/g, "").length;
}

function wordCount(text = "") {
    return String(text).trim().split(/\s+/).filter(Boolean).length;
}

function parseJSON(text) {
    const cleaned = cleanText(text);

    try {
        return JSON.parse(cleaned);
    } catch {}

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start >= 0 && end > start) {
        return JSON.parse(cleaned.slice(start, end + 1));
    }

    throw new Error("AI JSON parse failed");
}

async function createOutline(topic, research) {

    const prompt = `
You are planning a bilingual Korean/English YouTube long-form documentary.

TOPIC:
${topic}

FACT PACK:
${JSON.stringify(research, null, 2)}

Create exactly ${CHAPTER_COUNT} chapters specifically for THIS topic.

The structure must form one continuous 40-70 minute documentary.

Requirements:
- Do not use a generic fixed chapter template.
- Derive the chapters from the actual topic and FACT PACK.
- Start with a strong hook or mystery.
- Build historical/contextual understanding progressively.
- Put the strongest events, evidence, conflicts or revelations in the middle.
- End with present-day meaning, consequences, unresolved questions, or historical significance.
- Avoid repeating the same material between chapters.
- Do not invent facts.

Return ONLY valid JSON:

{
  "chapters": [
    {
      "number": 1,
      "titleKo": "한국어 챕터 제목",
      "titleEn": "Natural English chapter title",
      "purposeKo": "이 챕터가 담당할 내용"
    }
  ]
}
`;

    const result = parseJSON(await callAI(prompt));

    if (!Array.isArray(result.chapters) ||
        result.chapters.length !== CHAPTER_COUNT) {
        throw new Error("Invalid chapter outline");
    }

    return result.chapters;
}

async function writeBilingualChapter(topic, research, chapter) {

    const prompt = `
Create ONE chapter of a bilingual YouTube history/documentary long-form.

OVERALL TOPIC:
${topic}

FACT PACK:
${JSON.stringify(research, null, 2)}

CURRENT CHAPTER:
${chapter.number}. ${chapter.titleKo}

CHAPTER PURPOSE:
${chapter.purposeKo}

Write the Korean documentary narration first, then create its natural
American-English adaptation.

KOREAN REQUIREMENTS:
- Target about 2,000 Korean characters excluding spaces.
- Natural radio-documentary narration.
- Must make sense even without visuals.
- Do not repeat material merely to increase length.
- Natural Korean TTS phrasing.

ENGLISH REQUIREMENTS:
- Preserve the same facts, story progression and meaning.
- Adapt naturally for an English-speaking audience.
- Do NOT mechanically translate sentence-by-sentence.
- Natural American documentary narration.
- Natural spoken TTS phrasing.
- Keep approximately similar spoken duration to Korean.

FACTUAL RULES:
- Use only facts supported by the FACT PACK.
- Never invent dates, people, quotations, statistics or events.
- Clearly distinguish disputed claims or uncertainty.
- No fake quotations.
- No citations or source-number markers.
- No production directions.
- This is one chapter within a longer documentary.

Return ONLY valid JSON:

{
  "narrationKo": "한국어 실제 내레이션",
  "narrationEn": "English actual narration"
}
`;

    return parseJSON(await callAI(prompt));
}

async function main() {

    const data = readJSON(INPUT);

    if (!data.research) {
        throw new Error("Research data not found");
    }

    if (data.verification?.status === "REJECT") {
        throw new Error("Rejected topic cannot be produced");
    }

    const topic = cleanText(data.finalTopic);

    console.log("");
    console.log("================================");
    console.log("BILINGUAL LONGFORM WRITER");
    console.log("================================");
    console.log(topic);

    console.log("");
    console.log("[1] CREATING DYNAMIC OUTLINE");

    const outline = await createOutline(
        topic,
        data.research
    );

    console.log(`OUTLINE COMPLETE: ${outline.length} chapters`);

    const completed = [];

    for (const chapter of outline) {

        console.log("");
        console.log(
            `[${chapter.number}/${outline.length}] ${chapter.titleKo}`
        );

        const result = await writeBilingualChapter(
            topic,
            data.research,
            chapter
        );

        const narrationKo = cleanText(result.narrationKo);
        const narrationEn = cleanText(result.narrationEn);

        const charsKo = charCount(narrationKo);
        const wordsEn = wordCount(narrationEn);

        completed.push({
            ...chapter,
            charsKo,
            wordsEn,
            validKo: charsKo >= MIN_KO_CHARS,
            narrationKo,
            narrationEn
        });

        console.log(`KO CHARS=${charsKo}`);
        console.log(`EN WORDS=${wordsEn}`);
        console.log(`VALID=${charsKo >= MIN_KO_CHARS}`);
    }

    const scriptKo = completed
        .map(c => c.narrationKo)
        .join("\n\n");

    const scriptEn = completed
        .map(c => c.narrationEn)
        .join("\n\n");

    const totalCharsKo = charCount(scriptKo);
    const totalWordsEn = wordCount(scriptEn);

    const output = {
        createdAt: new Date().toISOString(),
        topic,

        languages: ["ko", "en"],

        aiCalls: 1 + completed.length,

        outlineCalls: 1,
        chapterCalls: completed.length,

        chapters: completed,

        scriptKo,
        scriptEn,

        totalCharsKo,
        totalWordsEn,

        estimatedKoMinutes:
            Number((totalCharsKo / 300).toFixed(1)),

        estimatedEnMinutes:
            Number((totalWordsEn / 145).toFixed(1)),

        durationValid:
            totalCharsKo >= MIN_TOTAL_KO_CHARS
    };

    fs.writeFileSync(
        OUTPUT,
        JSON.stringify(output, null, 2),
        "utf8"
    );

    console.log("");
    console.log("================================");
    console.log("BILINGUAL SCRIPT COMPLETE");
    console.log("================================");
    console.log(`KO CHARS=${totalCharsKo}`);
    console.log(`EN WORDS=${totalWordsEn}`);
    console.log(`KO EST=${output.estimatedKoMinutes} min`);
    console.log(`EN EST=${output.estimatedEnMinutes} min`);
    console.log(`DURATION VALID=${output.durationValid}`);
    console.log(`AI CALLS=${output.aiCalls}`);
    console.log(`SAVED: ${OUTPUT}`);
}

main().catch(error => {
    console.error("BILINGUAL WRITER FAILED:", error);
    process.exit(1);
});
