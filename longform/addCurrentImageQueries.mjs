import "dotenv/config";
import fs from "fs";
import path from "path";
import { DATA_ROOT } from "./config/paths.js";
import { callAI } from "../modules/ai/index.js";

const FILE = path.join(DATA_ROOT, "longform-script.json");
const BACKUP = path.join(DATA_ROOT, "longform-script.before-images.json");

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

function validQuery(image) {
    return (
        image &&
        typeof image.query === "string" &&
        image.query.trim()
    );
}

const chapters = data.chapters
    .filter(c =>
        !Array.isArray(c.images) ||
        c.images.length !== 2 ||
        c.images.some(image => !validQuery(image))
    )
    .map(c => ({
        number: c.number,
        title: c.titleKo || c.title,
        narration: (
            c.narrationKo ||
            c.narration ||
            ""
        ).slice(0, 1200)
    }));

if (!chapters.length) {
    console.log("IMAGE QUERIES ALREADY VALID");
    process.exit(0);
}

const prompt = `
역사 다큐멘터리의 각 챕터에 사용할
실제 무료 이미지 검색어를 작성하라.

전체 주제:
${data.topic}

챕터:
${JSON.stringify(chapters, null, 2)}

위에 제공된 챕터만 처리한다.
각 제공 챕터마다 정확히 2개만 만든다.
query 필드는 반드시 비어 있지 않은 영어 문자열이어야 한다.
query에 null을 절대 출력하지 않는다.

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

if (!Array.isArray(result.chapters)) {
    throw new Error("Image query response chapters missing");
}

for (const target of chapters) {
    const chapter = data.chapters.find(
        x => Number(x.number) === Number(target.number)
    );

    const found = result.chapters.find(
        x => Number(x.number) === Number(target.number)
    );

    const images =
        Array.isArray(found?.images)
            ? found.images.slice(0, 2)
            : [];

    if (
        images.length !== 2 ||
        images.some(image => !validQuery(image))
    ) {
        throw new Error(
            `Invalid image queries: chapter ${target.number}`
        );
    }

    chapter.images = images.map(image => ({
        ...image,
        query: image.query.trim()
    }));
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
