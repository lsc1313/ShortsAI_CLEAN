import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { callAI } from "../../modules/ai/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const SCRIPT = path.join(ROOT, "data", "longform-script.json");
const RESEARCH = path.join(ROOT, "data", "production-research.json");
const TIMELINE = path.join(ROOT, "data", "visuals", "chapter-timeline-ko.json");
const OUTPUT = path.join(ROOT, "data", "visuals", "background-plan.json");

function readJSON(file) {
    return JSON.parse(
        fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")
    );
}

function parseJSON(text = "") {
    const cleaned = String(text)
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch {}

    const a = cleaned.indexOf("{");
    const b = cleaned.lastIndexOf("}");

    if (a >= 0 && b > a) {
        return JSON.parse(cleaned.slice(a, b + 1));
    }

    throw new Error("JSON parse failed");
}

async function main() {
    const script = readJSON(SCRIPT);
    const research = readJSON(RESEARCH);
    const timeline = readJSON(TIMELINE);

    const chapters = timeline.chapters.map((c, i) => ({
        number: c.number,
        title: c.title,
        start: c.start,
        end: c.end,
        narration: (
            script.chapters[i].narrationKo ??
            script.chapters[i].narration ??
            ""
        ).slice(0, 1200)
    }));

    const prompt = `
역사 다큐멘터리 롱폼 영상의 배경 이미지 검색 계획을 작성하라.

주제:
${script.topic}

FACT PACK:
${JSON.stringify(research.research, null, 2)}

챕터:
${JSON.stringify(chapters, null, 2)}

목표:
각 챕터마다 실제로 검색 가능한 배경 이미지 검색어를 정확히 2개 만든다.
총 16개 이미지다.

중요:
- 이미지는 정보 전달의 주인공이 아니다.
- 제목과 자막이 메인이다.
- 이미지가 대본과 완벽히 일치하지 않아도 되지만 엉뚱하면 안 된다.
- 무료 역사자료에서 찾기 쉬운 실제 장소, 인물, 시설, 지도, 기록사진을 우선한다.
- Wikimedia Commons에서 검색하기 좋은 영어 검색어로 작성한다.
- 존재하지 않는 사진이나 사건을 만들지 않는다.
- 너무 구체적인 희귀 장면보다 실제 검색 성공 가능성을 우선한다.
- 두 이미지가 서로 비슷하지 않게 한다.

JSON만 출력:

{
  "chapters": [
    {
      "number": 1,
      "images": [
        {
          "query": "English Wikimedia search query",
          "purpose": "이 이미지가 담당할 분위기/내용"
        },
        {
          "query": "English Wikimedia search query",
          "purpose": "이 이미지가 담당할 분위기/내용"
        }
      ]
    }
  ]
}
`;

    console.log("CREATING BACKGROUND SEARCH PLAN...");

    const result = parseJSON(await callAI(prompt));

    const output = {
        createdAt: new Date().toISOString(),
        topic: script.topic,
        aiCalls: 1,
        imagesPerChapter: 2,
        totalImages: 16,
        chapters: result.chapters
    };

    fs.writeFileSync(
        OUTPUT,
        JSON.stringify(output, null, 2),
        "utf8"
    );

    console.log("BACKGROUND PLAN COMPLETE");
    console.log(`CHAPTERS=${result.chapters.length}`);
    console.log("IMAGES=16");
    console.log(`SAVED=${OUTPUT}`);
}

main().catch(err => {
    console.error("FAILED:", err.message);
    process.exit(1);
});
