import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { callGemini } from "../../modules/ai/gemini.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "data", "final-topic.json");
const OUTPUT = path.join(ROOT, "data", "research-pack.json");

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
        throw new Error("Research JSON not found");
    }

    return JSON.parse(cleaned.slice(start, end + 1));
}

async function main() {

    const data = readJSON(INPUT);
    const topic = data.finalTopic;

    if (!topic) {
        throw new Error("finalTopic not found");
    }

    console.log("");
    console.log("================================");
    console.log("LONGFORM RESEARCH AGENT");
    console.log("================================");
    console.log(topic);
    console.log("GEMINI SEARCH CALL: 1");

    const prompt = `
Google 웹검색을 사용하여 다음 주제의
40~70분 YouTube 다큐멘터리형 롱폼 제작용 자료를 조사하라.

주제:
${topic}

목표:
대본 작가가 추가 추측 없이 사용할 수 있는
신뢰도 높은 FACT PACK을 만드는 것이다.

반드시 웹검색 결과를 근거로 조사한다.

조사 항목:

1. 사건/주제의 핵심 배경
2. 정확한 연표
3. 핵심 인물과 조직
4. 장소와 당시 시대적 상황
5. 중요한 사건과 전환점
6. 일반 시청자가 흥미로워할 세부 사실
7. 널리 알려졌지만 사실과 다른 주장
8. 학계나 자료에서 의견이 갈리는 부분
9. 현재까지 이어지는 영향 또는 현재 상태
10. 40~70분 영상으로 확장할 수 있는 이야기 축
11. 오프닝에서 사용할 강력하지만 사실적인 Hook 소재
12. 대본에서 절대 사실로 단정하면 안 되는 내용

중요 규칙:

- 확인되지 않은 내용을 만들어내지 않는다.
- 전설, 추정, 주장, 논쟁은 반드시 구분한다.
- 날짜와 숫자는 가능한 한 구체적으로 확인한다.
- 자극성을 위해 사실을 왜곡하지 않는다.
- 서로 충돌하는 자료가 있으면 disagreement에 기록한다.
- 반복되는 사실로 분량을 억지로 늘리지 않는다.
- 출처 유형과 근거 수준을 sourceNotes에 요약한다.

ONLY JSON:

{
  "topic": "",
  "summary": "",
  "historicalContext": [],
  "timeline": [
    {
      "date": "",
      "event": "",
      "importance": ""
    }
  ],
  "people": [
    {
      "name": "",
      "role": "",
      "relevance": ""
    }
  ],
  "organizations": [],
  "locations": [],
  "keyFacts": [],
  "interestingFacts": [],
  "mythsAndCorrections": [
    {
      "claim": "",
      "correction": ""
    }
  ],
  "disagreements": [],
  "currentStatus": [],
  "storyArcs": [],
  "hookMaterial": [],
  "doNotStateAsFact": [],
  "sourceNotes": [],
  "researchConfidence": 0
}
`;

    const response = await callGemini(prompt);
    const research = parseJSON(response);

    const output = {
        researchedAt: new Date().toISOString(),
        finalTopic: topic,
        geminiCalls: 1,
        research
    };

    fs.writeFileSync(
        OUTPUT,
        JSON.stringify(output, null, 2),
        "utf8"
    );

    console.log("");
    console.log("RESEARCH CONFIDENCE:",
        research.researchConfidence ?? "UNKNOWN"
    );

    console.log("TIMELINE:",
        research.timeline?.length ?? 0
    );

    console.log("KEY FACTS:",
        research.keyFacts?.length ?? 0
    );

    console.log("STORY ARCS:",
        research.storyArcs?.length ?? 0
    );

    console.log("");
    console.log(`SAVED: ${OUTPUT}`);
}

main().catch(error => {
    console.error("RESEARCH FAILED:", error.message);
    process.exit(1);
});

