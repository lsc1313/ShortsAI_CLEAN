import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { collectHistoryAssets } from "../modules/history/assetPreflight.js";

// Archive-only smoke test. No Gemini, TTS, video rendering or uploads.
const topic = process.argv.slice(2).join(" ").trim() || "Titanic sinking";
const queries = [
    { query: topic, category: "event" },
    { query: topic + " illustration", category: "depiction" },
    { query: "ship sinking", category: "action" },
    { query: "sunken shipwreck", category: "aftermath" },
    { query: "lifeboat rescue", category: "rescue" },
    { query: "ocean liner wreck", category: "wreck" }
];
const outputDir = path.join("media", "history-archive-test");
const assets = await collectHistoryAssets(queries, { outputDir, maxAssets: 12 });
fs.mkdirSync(outputDir, { recursive: true });
const report = path.join(outputDir, "report.json");
fs.writeFileSync(report, JSON.stringify({ topic, count: assets.length, assets }, null, 2));
console.log("[HISTORY ARCHIVE TEST] Gemini calls: 0");
console.log("[HISTORY ARCHIVE TEST] Downloaded:", assets.length, "Report:", report);
if (assets.length < 3) process.exitCode = 1;
