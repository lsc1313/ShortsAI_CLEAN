import "dotenv/config";
import fs from "fs";
import { callAI } from "../modules/ai/index.js";

const FILE = "./longform/data/longform-script.json";
const BACKUP = "./longform/data/longform-script.before-images.json";

function clean(text = "") {
    return String(text)
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
}

function parseJSON(text) {
    const s = clean(text);

    try {
        return JSON.parse(s);
    } catch {}

    const a = s.indexOf("{");
    const b = s.lastIndexOf("}");

    if (a >= 0 && b > a) {
        return JSON.parse(s.slice(a, b + 1));
    }

    throw new Error("JSON parse failed");
}

const data = JSON.parse(
    fs.readFileSync(FILE, "utf8").replace(/^\uFEFF/, "")
);

fs.copyFileSync(FILE, BACKUP);

const chapters = data.chapters.map(c => ({
    number: c.number,
    title: c.titleKo || c.title,
    narration: (
        c.narrationKo ||
        c.narration ||
        ""
    ).slice(0, 1200)
}));

const prompt = `
역사 다큐멘터리의 각 챕터에 사용할
실제 무료 이미지 검색어를 작성하라.

전체 주제:
${data.topic}

챕터:
${JSON.stringify(chapters, null, 2)}

각 챕터마다 정확히 2개만 만든다.

규칙:
- 검색어는 영어.
- Pixabay / Pexels 같은 실제 이미지 검색에서 찾기 쉬워야 한다.
- 실제 장소, 인물, 시설, 지도, 역사적 사물을 우선한다.
- 존재하지 않는 사진이나 장면을 만들지 않는다.
- 지나치게 희귀하거나 세부적인 검색어는 피한다.
- 두 검색어는 서로 다른 시각적 역할을 가져야 한다.
- 이미지가 주인공이 아니라 제목과 자막의 배경이라는 점을 고려한다.
- 생성 이미지용 프롬프트가 아니라 실제 사진 검색어를 작성한다.

JSON만 출력:

{
  "chapters": [
    {
      "number": 1,
      "images": [
        {
          "query": "English search query",
          "purpose": "한국어 설명"
        },
        {
          "query": "English search query",
          "purpose": "한국어 설명"
        }
      ]
    }
  ]
}
`;

console.log("ADDING IMAGE QUERIES...");

const result = parseJSON(await callAI(prompt));

for (const chapter of data.chapters) {
    const found = result.chapters.find(
        x => Number(x.number) === Number(chapter.number)
    );

    if (!found || !Array.isArray(found.images)) {
        throw new Error(`Images missing: chapter ${chapter.number}`);
    }

    chapter.images = found.images.slice(0, 2);
}

fs.writeFileSync(
    FILE,
    JSON.stringify(data, null, 2),
    "utf8"
);

console.log("IMAGE QUERIES ADDED");
console.log(`CHAPTERS=${data.chapters.length}`);
console.log(
    `IMAGES=${data.chapters.reduce((n,c)=>n+(c.images?.length||0),0)}`
);
console.log(`BACKUP=${BACKUP}`);
