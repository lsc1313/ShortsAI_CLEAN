import fs from "node:fs";
import { rememberExistingTopic } from "./longform/productionState.js";

const file = "D:/ShortsAI_DATA/longform/longform-script.json";

if (!fs.existsSync(file)) {
    console.log("NO LEGACY SCRIPT FOUND");
    process.exit(0);
}

const data = JSON.parse(
    fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")
);

const topic = String(data.topic || "").trim();

if (!topic) {
    throw new Error("Legacy topic missing");
}

const id = rememberExistingTopic(topic);

console.log("EXISTING LONGFORM TOPIC REGISTERED");
console.log(`ID=${id}`);
console.log(`TOPIC=${topic}`);
