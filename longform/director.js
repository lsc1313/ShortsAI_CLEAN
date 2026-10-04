import { DATA_ROOT } from "./config/paths.js";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { callAI } from "../modules/ai/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT = path.join(DATA_ROOT, "production-research.json");
const OUTPUT = path.join(DATA_ROOT, "longform-script.json");

const CHAPTER_COUNT = 8;
const MIN_KO_CHARS = 1300;

function readJSON(file) {
    return JSON.parse(
        fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")
    );
}

function cleanText(text = "") {
    return String(text)
        .replace(/```(?:json|text|markdown)?/gi, "")
        .replace(/```/g, "")
        .replace(/\[\s*\d+(?:\.\d+)?(?:\s*,\s*\d+(?:\.\d+)?)*\s*\]/g, "")
        .trim();
}

function parseJSON(text = "") {
    const cleaned = cleanText(text);

    try {
        return JSON.parse(cleaned);
    } catch {}

    let start = -1;

    for (let i = 0; i < cleaned.length; i++) {
        if (cleaned[i] === "{" || cleaned[i] === "[") {
            start = i;
            break;
        }
    }

    if (start < 0) {
        throw new Error("AI JSON start not found");
    }

    const stack = [];
    let inString = false;
    let escaped = false;

    for (let i = start; i < cleaned.length; i++) {
        const ch = cleaned[i];

        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }

            if (ch === "\\") {
                escaped = true;
                continue;
            }

            if (ch === '"') {
                inString = false;
            }

            continue;
        }

        if (ch === '"') {
            inString = true;
            continue;
        }

        if (ch === "{") {
            stack.push("}");
            continue;
        }

        if (ch === "[") {
            stack.push("]");
            continue;
        }

        if (ch === "}" || ch === "]") {
            const expected = stack.pop();

            if (expected !== ch) {
                throw new Error("AI JSON bracket mismatch");
            }

            if (stack.length === 0) {
                return JSON.parse(cleaned.slice(start, i + 1));
            }
        }
    }

    throw new Error("AI JSON incomplete");
}

function charCount(text = "") {
    return String(text).replace(/\s/g, "").length;
}

function wordCount(text = "") {
    return String(text)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .length;
}

function chapterRules(topic, research) {
    return `
전체 주제:
${topic}

FACT PACK:
${JSON.stringify(research, null, 2)}

공통 규칙:
- 한국어와 영어 버전을 함께 만든다.
- 화면 없이 들어도 이해되는 라디오 다큐멘터리 문체.
- FACT PACK에 없는 구체적 사실을 창작하지 않는다.
- 날짜, 숫자, 인물, 발언, 사건을 만들어내지 않는다.
- 가짜 인용문 금지.
- 논쟁이나 추정은 확정 사실과 구분한다.
- 출처 번호나 citation을 내레이션에 넣지 않는다.
- 장면 지시나 제작 지시를 넣지 않는다.
- 한국어는 공백 제외 약 2,000자를 목표로 한다.
- 영어는 직역하지 말고 자연스러운 미국식 다큐 내레이션으로 만든다.
- 두 언어의 실제 재생시간이 크게 차이나지 않게 한다.

이미지 규칙:
- 각 챕터를 대표하는 배경 이미지 정확히 2개를 선택한다.
- 실제 무료 이미지 검색에서 찾기 쉬운 대상이어야 한다.
- 장소, 인물, 시설, 지도, 기록사진, 역사적 사물을 우선한다.
- 존재하지 않는 사진이나 장면을 만들지 않는다.
- 너무 희귀하고 세부적인 장면은 피한다.
- 두 이미지는 서로 다른 역할을 담당한다.
- 이미지는 정보 전달의 핵심이 아니라 제목과 자막의 배경이다.
- 검색어는 영어로 작성한다.
`;
}

async function createPlanAndChapter1(topic, research) {

    const prompt = `
너는 YouTube 롱폼 다큐멘터리의 Director다.

${chapterRules(topic, research)}

먼저 이 주제를 정확히 8개의 자연스러운 챕터로 설계한다.

그리고 같은 응답에서 챕터 1의
한국어 대본, 영어 대본, 배경 이미지 2개까지 완성한다.

고정된 일반 템플릿을 사용하지 말고
현재 주제와 FACT PACK에 맞춰 챕터를 설계한다.

전체 흐름:
- 초반 강한 호기심
- 배경과 맥락
- 핵심 사건과 인물
- 가장 중요한 전환점
- 결과와 영향
- 현재의 의미 또는 남은 의문

JSON만 출력:

{
  "metadata": {
    "titleKo": "검색 키워드를 자연스럽게 포함하고 과장 없이 호기심을 유도하는 한국어 YouTube 롱폼 제목. 핵심 사건/인물/연도를 가능하면 포함하고 70자 이내.",
    "titleEn": "Natural clickable English long-form YouTube title. Include the core event/person/year when useful, avoid sensational or unsupported claims, and keep it concise.",
    "thumbnailTextKo": "한국어 썸네일용 짧은 문구. 영상 제목을 반복하지 말고 핵심 궁금증이나 반전을 10~22자 정도로 표현. 과장되거나 사실로 확인되지 않은 주장은 금지.",
    "thumbnailTextEn": "Short natural English thumbnail text, ideally 3 to 7 words. Create curiosity without repeating the full title or making unsupported claims.",
    "descriptionKo": "한국어 YouTube 설명문. 4~7개 짧은 문단으로 작성. 첫 2문장은 핵심 사건과 시청 이유를 명확히 설명하고, 이후 영상에서 다루는 주요 쟁점과 역사적 맥락을 소개. 사실로 확인되지 않은 주장이나 음모론은 단정하지 말 것. 마지막에 채널 성격에 맞는 자연스러운 구독 유도 1문장과 관련 해시태그 3개 포함.",
    "descriptionEn": "Natural English YouTube documentary description in 4 to 7 short paragraphs. Open with the core historical event and why it matters, explain the main questions and historical context covered in the video, avoid unsupported or sensational claims, then end with one natural subscription sentence and 3 relevant hashtags.",
    "tagsKo": ["주제 핵심키워드", "사건명", "인물명", "연도", "지역", "역사", "역사다큐", "다큐멘터리", "관련검색어1", "관련검색어2", "관련검색어3", "관련검색어4"],
    "tagsEn": ["core topic", "event name", "person name", "year", "location", "history", "history documentary", "documentary", "related search term 1", "related search term 2", "related search term 3", "related search term 4"]
  },
  "chapters": [
    {
      "number": 1,
      "titleKo": "한국어 챕터 제목",
      "titleEn": "Natural English title",
      "purposeKo": "이 챕터가 담당할 내용"
    }
  ],
  "chapter1": {
    "narrationKo": "한국어 내레이션",
    "narrationEn": "English narration",
    "images": [
      {
        "query": "English image search query",
        "purpose": "이미지 역할"
      },
      {
        "query": "English image search query",
        "purpose": "이미지 역할"
      }
    ]
  }
}
`;

    const result = parseJSON(await callAI(prompt));

    if (
        !Array.isArray(result.chapters) ||
        result.chapters.length !== CHAPTER_COUNT
    ) {
        throw new Error("Director outline invalid");
    }

    if (!result.chapter1) {
        throw new Error("Chapter 1 missing");
    }

    return result;
}

async function createChapter(topic, research, chapter) {

    const prompt = `
너는 YouTube 롱폼 다큐멘터리의 Director다.

${chapterRules(topic, research)}

현재 챕터:
${chapter.number}. ${chapter.titleKo}

영문 제목:
${chapter.titleEn}

이 챕터의 역할:
${chapter.purposeKo}

이 챕터 하나만 완성한다.

JSON만 출력:

{
  "narrationKo": "한국어 실제 내레이션",
  "narrationEn": "English actual narration",
  "images": [
    {
      "query": "English image search query",
      "purpose": "이미지 역할"
    },
    {
      "query": "English image search query",
      "purpose": "이미지 역할"
    }
  ]
}
`;

    return parseJSON(await callAI(prompt));
}

function makeChapter(chapter, result) {

    const narrationKo = cleanText(result.narrationKo);
    const narrationEn = cleanText(result.narrationEn);

    const images = Array.isArray(result.images)
        ? result.images.slice(0, 2)
        : [];

    return {
        number: chapter.number,

        // 기존 모듈 호환
        title: chapter.titleKo,
        purpose: chapter.purposeKo,
        narration: narrationKo,

        // 신규 bilingual
        titleKo: chapter.titleKo,
        titleEn: chapter.titleEn,
        purposeKo: chapter.purposeKo,

        narrationKo,
        narrationEn,

        chars: charCount(narrationKo),
        charsKo: charCount(narrationKo),
        wordsEn: wordCount(narrationEn),

        valid: charCount(narrationKo) >= MIN_KO_CHARS,
        validKo: charCount(narrationKo) >= MIN_KO_CHARS,

        images
    };
}

async function main() {

    const data = readJSON(INPUT);

    if (!data.research) {
        throw new Error("Research data not found");
    }

    if (data.verification?.status === "REJECT") {
        throw new Error("Rejected topic");
    }

    const topic = cleanText(data.finalTopic);

    console.log("");
    console.log("================================");
    console.log("LONGFORM DIRECTOR");
    console.log("================================");
    console.log(topic);

    // AI CALL 1
    console.log("");
    console.log("[1/8] OUTLINE + CHAPTER 1");

    const first = await createPlanAndChapter1(
        topic,
        data.research
    );

    const outline = first.chapters;

    /*
    =================================================
    DIRECTOR OUTLINE TITLE VALIDATION

    영어 챕터 제목 누락 상태로
    TTS / 이미지 / 렌더 단계까지 진행하지 않는다.
    =================================================
    */
    for (const chapter of outline) {

        chapter.titleKo =
            cleanText(chapter.titleKo);

        chapter.titleEn =
            cleanText(chapter.titleEn);

        chapter.purposeKo =
            cleanText(chapter.purposeKo);

        if (!chapter.titleKo) {
            throw new Error(
                `Director outline missing titleKo: chapter ${chapter.number}`
            );
        }

        if (!chapter.titleEn) {
            throw new Error(
                `Director outline missing titleEn: chapter ${chapter.number}`
            );
        }
    }


    /*
    =================================================
    LONGFORM YOUTUBE METADATA

    AI 호출 추가 없음.
    첫 Director 호출의 metadata를 사용한다.
    =================================================
    */

    const rawMetadata =
        first.metadata || {};

    const normalizeTitle = (
        value,
        fallback
    ) =>
        cleanText(value || fallback)
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 95);

    const normalizeDescription = (
        value,
        fallback
    ) =>
        cleanText(value || fallback)
            .trim()
            .slice(0, 4500);

    const normalizeTags = (
        value,
        fallback
    ) => {

        const source =
            Array.isArray(value)
                ? value
                : fallback;

        return [
            ...new Set(
                source
                    .map(tag =>
                        String(tag || "")
                            .replace(/^#+/, "")
                            .trim()
                    )
                    .filter(Boolean)
            )
        ]
            .slice(0, 10);
    };


    const fallbackTitleEn =
        outline?.[0]?.titleEn ||
        "History Documentary";


    const longformMetadata = {

        titleKo:
            normalizeTitle(
                rawMetadata.titleKo,
                topic
            ),

        titleEn:
            normalizeTitle(
                rawMetadata.titleEn,
                fallbackTitleEn
            ),

        thumbnailTextKo:
            normalizeTitle(
                rawMetadata.thumbnailTextKo,
                rawMetadata.titleKo || topic
            ),

        thumbnailTextEn:
            normalizeTitle(
                rawMetadata.thumbnailTextEn,
                rawMetadata.titleEn || fallbackTitleEn
            ),

        descriptionKo:
            normalizeDescription(
                rawMetadata.descriptionKo,
                `${topic}

8개 챕터로 구성된 역사 롱폼 다큐멘터리입니다.`
            ),

        descriptionEn:
            normalizeDescription(
                rawMetadata.descriptionEn,
                `An eight-chapter long-form history documentary exploring ${fallbackTitleEn}.`
            ),

        tagsKo:
            normalizeTags(
                rawMetadata.tagsKo,
                [
                    "역사",
                    "다큐멘터리",
                    "롱폼",
                    "역사이야기"
                ]
            ),

        tagsEn:
            normalizeTags(
                rawMetadata.tagsEn,
                [
                    "history",
                    "documentary",
                    "longform",
                    "historical documentary"
                ]
            )

    };

    const completed = [
        makeChapter(outline[0], first.chapter1)
    ];

    console.log(
        `KO=${completed[0].charsKo} EN=${completed[0].wordsEn} IMG=${completed[0].images.length}`
    );

    // AI CALL 2~8
    for (let i = 1; i < outline.length; i++) {

        const chapter = outline[i];

        console.log("");
        console.log(
            `[${i + 1}/8] ${chapter.titleKo}`
        );

        const result = await createChapter(
            topic,
            data.research,
            chapter
        );

        const finished = makeChapter(
            chapter,
            result
        );

        completed.push(finished);

        console.log(
            `KO=${finished.charsKo} EN=${finished.wordsEn} IMG=${finished.images.length}`
        );
    }

    const scriptKo = completed
        .map(c => c.narrationKo)
        .join("\n\n");

    const scriptEn = completed
        .map(c => c.narrationEn)
        .join("\n\n");

    const totalCharsKo = charCount(scriptKo);
    const totalWordsEn = wordCount(scriptEn);

    const totalImages = completed.reduce(
        (sum, c) => sum + c.images.length,
        0
    );

    const output = {
        createdAt: new Date().toISOString(),

        director: "longform",
        topic,

        languages: ["ko", "en"],

        aiCalls: 8,

        titleKo:
            longformMetadata.titleKo,

        titleEn:
            longformMetadata.titleEn,

        thumbnailTextKo:
            longformMetadata.thumbnailTextKo,

        thumbnailTextEn:
            longformMetadata.thumbnailTextEn,

        descriptionKo:
            longformMetadata.descriptionKo,

        descriptionEn:
            longformMetadata.descriptionEn,

        tagsKo:
            longformMetadata.tagsKo,

        tagsEn:
            longformMetadata.tagsEn,

        metadata:
            longformMetadata,

        chapters: completed,

        // 기존 호환
        script: scriptKo,
        totalChars: totalCharsKo,

        // 신규
        scriptKo,
        scriptEn,

        totalCharsKo,
        totalWordsEn,
        totalImages,

        estimatedKoMinutes:
            Number((totalCharsKo / 300).toFixed(1)),

        estimatedEnMinutes:
            Number((totalWordsEn / 145).toFixed(1))
    };

    fs.writeFileSync(
        OUTPUT,
        JSON.stringify(output, null, 2),
        "utf8"
    );

    console.log("");
    console.log("================================");
    console.log("DIRECTOR COMPLETE");
    console.log("================================");
    console.log(`AI CALLS=${output.aiCalls}`);
    console.log(`KO CHARS=${totalCharsKo}`);
    console.log(`EN WORDS=${totalWordsEn}`);
    console.log(`IMAGES=${totalImages}`);
    console.log(`SAVED=${OUTPUT}`);
}

main().catch(error => {
    console.error("DIRECTOR FAILED:", error.message);
    process.exit(1);
});
