import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { callAI } from "../../modules/ai/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "data", "production-research.json");
const OUTPUT = path.join(ROOT, "data", "content-package.json");

const TARGET_MIN_CHARS = 12000;
const TARGET_MAX_CHARS = 20000;
const CHARS_PER_MINUTE = 300;

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
        throw new Error("Content JSON not found");
    }

    return JSON.parse(cleaned.slice(start, end + 1));
}

function cleanText(text = "") {
    return String(text)
        .replace(/\[\s*\d+(?:\.\d+)?(?:\s*,\s*\d+(?:\.\d+)?)*\s*\]/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
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
    console.log("LONGFORM CONTENT WRITER");
    console.log("================================");
    console.log(topic);
    console.log("AI CALL: 1");
    console.log("TARGET: 12000~20000 CHARS");

    const prompt = `
너는 한국어 YouTube 다큐멘터리형 롱폼 전문 작가다.

아래 FACT PACK만을 근거로
실제로 40~70분 동안 들을 수 있는 완성 대본을 작성하라.

주제:
${topic}

FACT PACK:
${JSON.stringify(data.research, null, 2)}

매우 중요:
estimatedMinutes 숫자만 40~70으로 쓰는 것은 금지한다.
실제 내레이션 원고 자체가 충분히 길어야 한다.

전체 대본 목표:
공백 제외 최소 12,000자.
권장 12,000~20,000자.

총 8개 챕터를 작성한다.
각 챕터의 narration은 충분히 상세하게 작성한다.

권장 구성:

1. 강력한 오프닝과 미스터리 제시
2. 시대적 배경
3. 장소와 핵심 인물
4. 탄생 또는 사건의 시작
5. 내부의 삶과 핵심 사건
6. 중요한 전환점과 갈등
7. 진실, 오해, 논쟁점
8. 현재 상태와 역사적 의미

절대 규칙:

- FACT PACK에 없는 구체적 사실을 창작하지 않는다.
- 날짜, 숫자, 인물, 발언을 만들어내지 않는다.
- 가짜 인용문을 만들지 않는다.
- 추정과 논쟁은 명확히 구분한다.
- 같은 문장을 반복해 분량을 채우지 않는다.
- 화면 없이 들어도 이해되는 라디오 다큐멘터리 문체로 쓴다.
- 각 챕터는 독립적인 요약문이 아니라 실제 내레이션 원고여야 한다.
- 장면 설명, 제작 지시, 괄호 속 연출 지시는 넣지 않는다.
- 출처 번호나 citation 표시는 넣지 않는다.
- 자연스러운 한국어 TTS 문장으로 작성한다.
- 챕터 사이 연결이 자연스러워야 한다.
- 마지막에는 현재와 역사적 의미까지 연결한다.

제목은 사실을 왜곡하지 않으면서 클릭을 유도한다.
썸네일 문구는 짧고 강하게 작성한다.

ONLY JSON:

{
  "title": "",
  "alternativeTitles": [
    "",
    "",
    ""
  ],
  "description": "",
  "thumbnailTexts": [
    "",
    "",
    ""
  ],
  "chapters": [
    {
      "chapter": 1,
      "title": "",
      "narration": ""
    },
    {
      "chapter": 2,
      "title": "",
      "narration": ""
    },
    {
      "chapter": 3,
      "title": "",
      "narration": ""
    },
    {
      "chapter": 4,
      "title": "",
      "narration": ""
    },
    {
      "chapter": 5,
      "title": "",
      "narration": ""
    },
    {
      "chapter": 6,
      "title": "",
      "narration": ""
    },
    {
      "chapter": 7,
      "title": "",
      "narration": ""
    },
    {
      "chapter": 8,
      "title": "",
      "narration": ""
    }
  ]
}
`;

    const response = await callAI(prompt);
    const content = parseJSON(response);

    content.title = cleanText(content.title);
    content.description = cleanText(content.description);

    content.alternativeTitles =
        (content.alternativeTitles || []).map(cleanText);

    content.thumbnailTexts =
        (content.thumbnailTexts || []).map(cleanText);

    content.chapters =
        (content.chapters || []).map(item => ({
            ...item,
            title: cleanText(item.title),
            narration: cleanText(item.narration)
        }));

    const fullScript = content.chapters
        .map(item => item.narration)
        .filter(Boolean)
        .join("\n\n");

    const scriptChars =
        fullScript.replace(/\s/g, "").length;

    const actualMinutes =
        Number((scriptChars / CHARS_PER_MINUTE).toFixed(1));

    const durationValid =
        scriptChars >= TARGET_MIN_CHARS;

    content.script = fullScript;
    content.scriptChars = scriptChars;
    content.estimatedMinutes = actualMinutes;
    content.durationValid = durationValid;
    content.targetMinChars = TARGET_MIN_CHARS;
    content.targetMaxChars = TARGET_MAX_CHARS;

    const output = {
        createdAt: new Date().toISOString(),
        topic,
        aiCalls: 1,
        content
    };

    fs.writeFileSync(
        OUTPUT,
        JSON.stringify(output, null, 2),
        "utf8"
    );

    console.log("");
    console.log("TITLE:");
    console.log(content.title);

    console.log("");
    console.log(`CHAPTERS=${content.chapters.length}`);
    console.log(`SCRIPT CHARS=${scriptChars}`);
    console.log(`ESTIMATED MINUTES=${actualMinutes}`);
    console.log(`DURATION VALID=${durationValid}`);

    if (!durationValid) {
        console.log("");
        console.log(
            `FAIL: script requires at least ${TARGET_MIN_CHARS} characters`
        );
    }

    console.log("");
    console.log(`SAVED: ${OUTPUT}`);
}

main().catch(error => {
    console.error("CONTENT WRITER FAILED:", error.message);
    process.exit(1);
});
