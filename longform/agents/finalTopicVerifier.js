import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { callGemini } from "../../modules/ai/gemini.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "data", "topic-verification.json");
const OUTPUT = path.join(ROOT, "data", "final-topic.json");

function readJSON(file) {
    return JSON.parse(
        fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")
    );
}

function parseJSON(text) {
    const cleaned = String(text)
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1) {
        throw new Error("Final verification JSON not found");
    }

    return JSON.parse(cleaned.slice(start, end + 1));
}

async function main() {

    const data = readJSON(INPUT);
    const selected = data.selected;

    if (!selected) {
        throw new Error("Selected topic not found");
    }

    const topic =
        selected.verification?.correctedTopic ||
        selected.topic;

    console.log("");
    console.log("================================");
    console.log("FINAL TOPIC DEEP VERIFICATION");
    console.log("================================");
    console.log(topic);
    console.log("GEMINI SEARCH CALL: 1");

    const prompt = `
Google 웹검색을 사용하여 아래 주제 하나를 제작 직전 최종 정밀 사실검증하라.

주제:
${topic}

이 검증은 YouTube 40~70분 롱폼 제작 직전의 마지막 검증이다.

단순히 사건이 실제 존재하는지만 확인하지 말고,
주제 문장의 모든 핵심 주장과 표현을 각각 확인하라.

특히 확인할 것:

1. 사건, 인물, 장소, 조직이 실제 존재하는가?
2. 연도와 시대가 정확한가?
3. "사라졌다", "비밀이었다", "금지됐다", "암살됐다",
   "은폐됐다", "최초", "유일", "100만 명" 같은 핵심 표현이 정확한가?
4. 서로 다른 사건이나 인물이 섞이지 않았는가?
5. 논쟁적인 해석을 확정된 사실처럼 표현하지 않았는가?
6. 현재까지 이어지는 장소/조직/상태라면 과거형 표현이 잘못되지 않았는가?
7. 신뢰 가능한 자료를 기반으로 40~70분 롱폼 제작이 가능한가?

조금이라도 중요한 오류가 있으면 PASS 하지 말고 FIX하라.

FIX라면 correctedTopic은
흥미를 유지하면서도 사실적으로 정확한 최종 제작 주제로 다시 작성한다.

REJECT는 핵심 전제 자체가 잘못됐거나
신뢰 가능한 자료로 롱폼 제작이 어려운 경우에만 사용한다.

confidence는 반드시 0~100 정수.

ONLY JSON:

{
  "status": "PASS|FIX|REJECT",
  "confidence": 0,
  "finalTopic": "",
  "issues": [],
  "verifiedFacts": [],
  "sourceSummary": "",
  "longformReady": true
}
`;

    const response = await callGemini(prompt);
    const verification = parseJSON(response);

    const finalTopic =
        verification.finalTopic ||
        topic;

    const output = {
        verifiedAt: new Date().toISOString(),
        originalTopic: selected.topic,
        batchTopic: topic,
        finalTopic,
        verification,
        youtubeScores: selected.scores || {}
    };

    fs.writeFileSync(
        OUTPUT,
        JSON.stringify(output, null, 2),
        "utf8"
    );

    console.log("");
    console.log(
        `STATUS=${verification.status} | CONFIDENCE=${verification.confidence}`
    );

    console.log("");
    console.log("FINAL PRODUCTION TOPIC:");
    console.log(finalTopic);

    console.log("");
    console.log(`SAVED: ${OUTPUT}`);
}

main().catch(error => {
    console.error("FINAL VERIFY FAILED:", error.message);
    process.exit(1);
});

