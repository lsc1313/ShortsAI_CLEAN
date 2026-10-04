import { DATA_ROOT } from "../config/paths.js";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { callGemini } from "../../modules/ai/gemini.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(DATA_ROOT, "topic-verification.json");
const OUTPUT = path.join(DATA_ROOT, "production-research.json");

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
    const selected = data.selected;

    if (!selected) {
        throw new Error("Selected topic not found");
    }

    const topic =
        selected.verification?.correctedTopic ||
        selected.topic;

    console.log("");
    console.log("================================");
    console.log("PRODUCTION RESEARCH");
    console.log("================================");
    console.log(topic);
    console.log("GEMINI SEARCH CALL: 1");

    const prompt = `
Google ?밴??됱쓣 ?ъ슜?섏뿬 ?꾨옒 二쇱젣瑜?YouTube 40~70遺?濡깊뤌 ?쒖옉 吏곸쟾 ?④퀎源뚯? ??踰덉뿉 泥섎━?섎씪.

二쇱젣:
${topic}

?대쾲 ?묒뾽? ?ㅼ쓬 ???묒뾽???숈떆???섑뻾?쒕떎.

A. 理쒖쥌 ?뺣? ?ъ떎寃利?B. ?蹂??쒖옉??FACT PACK + ?댁빞湲?援ъ꽦 ?ㅺ퀎

[理쒖쥌 ?ъ떎寃利?

二쇱젣 臾몄옣??紐⑤뱺 ?듭떖 ?쒗쁽???뺤씤?쒕떎.

- ?ш굔, ?몃Ъ, ?μ냼, 議곗쭅
- ?곕룄? ?쒕?
- ?レ옄? 洹쒕え
- "?щ씪議뚮떎", "鍮꾨?", "???, "湲덉?", "?붿궡",
  "理쒖큹", "?좎씪" ?깆쓽 ?쒗쁽
- ?쒕줈 ?ㅻⅨ ?ш굔???쇳빀 ?щ?
- ?쇱웳??二쇱옣???ъ떎泥섎읆 ?쒗쁽?덈뒗吏 ?щ?
- ?꾩옱源뚯? ?댁뼱吏???곹깭

?ㅻ쪟媛 ?덉쑝硫?correctedTopic???ъ떎??留욊쾶 ?섏젙?쒕떎.

[?먮즺議곗궗]

40~70遺??ㅽ걧硫섑꽣由ы삎 ?蹂몄쓣 留뚮뱾 ???덈룄濡?議곗궗?쒕떎.

- ??궗??諛곌꼍
- ?뺥솗???고몴
- ?듭떖 ?몃Ъ/議곗쭅
- 二쇱슂 ?μ냼
- ?듭떖 ?ш굔怨??꾪솚??- ?λ?濡쒖슫 ?몃? ?ъ떎
- ?섎せ ?뚮젮吏?二쇱옣怨??뺤젙
- ?숆퀎/?먮즺???쇱웳??- ?꾩옱 ?곹깭? ?곹뼢
- ?댁빞湲??꾧컻 異?- ?ъ떎?곸씤 Hook ?뚯옱
- ?ъ떎濡??⑥젙?섎㈃ ???섎뒗 ?댁슜

[洹쒖튃]

- 諛섎뱶???밴???寃곌낵瑜?洹쇨굅濡??쒕떎.
- ?뺤씤?섏? ?딆? ?ъ떎??留뚮뱾吏 ?딅뒗??
- ?꾩꽕/異붿젙/二쇱옣/?쇱웳? ?ъ떎怨?援щ텇?쒕떎.
- ?쒕줈 異⑸룎?섎뒗 ?먮즺??disagreements??湲곕줉?쒕떎.
- 諛섎났?쇰줈 遺꾨웾???섎━吏 ?딅뒗??
- confidence? researchConfidence??諛섎뱶??0~100 ?뺤닔??
- ?듭떖 ?꾩젣媛 ?덉쐞硫?REJECT.
- ?섏젙?섎㈃ ?쒖옉 媛?ν븳 寃쎌슦 FIX.
- 洹몃?濡??뺥솗?섎㈃ PASS.

ONLY JSON:

{
  "verification": {
    "status": "PASS|FIX|REJECT",
    "confidence": 0,
    "correctedTopic": "",
    "issues": [],
    "longformReady": true
  },
  "research": {
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
}
`;

    const response = await callGemini(prompt);
    const result = parseJSON(response);

    const finalTopic =
        result.verification?.correctedTopic ||
        topic;

    const output = {
        createdAt: new Date().toISOString(),
        originalTopic: selected.topic,
        inputTopic: topic,
        finalTopic,
        geminiCalls: 1,
        youtubeScores: selected.scores || {},
        verification: result.verification,
        research: result.research
    };

    fs.writeFileSync(
        OUTPUT,
        JSON.stringify(output, null, 2),
        "utf8"
    );

    console.log("");
    console.log(
        `STATUS=${result.verification?.status}` +
        ` | CONFIDENCE=${result.verification?.confidence}`
    );

    console.log(
        `RESEARCH CONFIDENCE=${result.research?.researchConfidence}`
    );

    console.log(
        `TIMELINE=${result.research?.timeline?.length ?? 0}`
    );

    console.log(
        `KEY FACTS=${result.research?.keyFacts?.length ?? 0}`
    );

    console.log(
        `STORY ARCS=${result.research?.storyArcs?.length ?? 0}`
    );

    console.log("");
    console.log("FINAL PRODUCTION TOPIC:");
    console.log(finalTopic);

    console.log("");
    console.log(`SAVED: ${OUTPUT}`);
}

main().catch(error => {
    console.error("PRODUCTION RESEARCH FAILED:", error.message);
    process.exit(1);
});

