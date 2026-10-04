import { DATA_ROOT } from "../config/paths.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { callAI } from "../../modules/ai/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "config", "longform.json");
const OUTPUT_PATH = path.join(DATA_ROOT, "topic-candidates.json");

function readConfig() {
    return JSON.parse(
        fs.readFileSync(CONFIG_PATH, "utf8").replace(/^\uFEFF/, "")
    );
}

function parseJSON(text) {
    const cleaned = String(text)
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");

    if (start === -1 || end === -1) {
        throw new Error("AI response does not contain JSON array");
    }

    return JSON.parse(cleaned.slice(start, end + 1));
}

export async function scoutTopics() {

    const config = readConfig();

    const prompt = `
You are a YouTube long-form topic discovery agent.

Generate exactly ${config.candidateCount} DIFFERENT topic candidates.

CHANNEL CONFIG
genre: ${config.genre}
language: ${config.language}
target video duration: ${config.targetDurationMinutes.min}-${config.targetDurationMinutes.max} minutes

GOAL
Find topics suitable for long-form YouTube videos that people can listen to like radio.

TOPIC RULES
- Must support at least ${config.targetDurationMinutes.min} minutes of storytelling or explanation.
- Prefer strong curiosity, mystery, conflict, unanswered questions, surprising facts, or dramatic events.
- Avoid generic textbook topics.
- Avoid topics that are nearly identical to each other.
- Each topic must have enough factual material for a full long-form script.
- Do not fabricate events.
- Topic selection must not depend on visuals.
- Titles should create curiosity without misleading clickbait.
- Return candidates only. Do not write scripts.

Return ONLY valid JSON.

[
  {
    "topic": "core subject",
    "titleIdea": "possible YouTube title",
    "searchQueries": [
      "query 1",
      "query 2",
      "query 3"
    ],
    "reason": "why this can sustain a long-form video"
  }
]
`;

    console.log("");
    console.log("================================");
    console.log("LONGFORM TOPIC SCOUT");
    console.log("================================");
    console.log(`GENRE: ${config.genre}`);
    console.log(`TARGET: ${config.candidateCount}`);

    const response = await callAI(prompt);

    const candidates = parseJSON(response);

    if (!Array.isArray(candidates)) {
        throw new Error("Invalid candidate response");
    }

    const normalized = candidates
        .filter(item => item?.topic)
        .slice(0, config.candidateCount)
        .map((item, index) => ({
            id: index + 1,
            topic: String(item.topic).trim(),
            titleIdea: String(item.titleIdea || "").trim(),
            searchQueries: Array.isArray(item.searchQueries)
                ? item.searchQueries.slice(0, 3)
                : [],
            reason: String(item.reason || "").trim()
        }));

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

    fs.writeFileSync(
        OUTPUT_PATH,
        JSON.stringify(
            {
                generatedAt: new Date().toISOString(),
                genre: config.genre,
                candidates: normalized
            },
            null,
            2
        ),
        "utf8"
    );

    console.log("");
    console.log(`TOPIC CANDIDATES: ${normalized.length}`);
    console.log(`SAVED: ${OUTPUT_PATH}`);

    return normalized;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {

    scoutTopics()
        .then(topics => {

            console.log("");

            for (const item of topics) {
                console.log(`${item.id}. ${item.topic}`);
            }

        })
        .catch(error => {

            console.error("");
            console.error("TOPIC SCOUT FAILED");
            console.error(error);

            process.exit(1);
        });
}
