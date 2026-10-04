import fs from "node:fs";

const file = "./longform/director.js";

let s =
    fs.readFileSync(
        file,
        "utf8"
    );

const oldBlock = `"metadata": {
    "titleKo": "한국어 YouTube 롱폼 제목",
    "titleEn": "Natural clickable English long-form YouTube title",
    "descriptionKo": "영상 전체를 소개하는 한국어 설명 2~4문장",
    "descriptionEn": "Natural English description of the full documentary in 2 to 4 sentences",
    "tagsKo": ["역사", "다큐멘터리"],
    "tagsEn": ["history", "documentary"]
  },`;

const newBlock = `"metadata": {
    "titleKo": "검색 키워드를 자연스럽게 포함하고 과장 없이 호기심을 유도하는 한국어 YouTube 롱폼 제목. 핵심 사건/인물/연도를 가능하면 포함하고 70자 이내.",
    "titleEn": "Natural clickable English long-form YouTube title. Include the core event/person/year when useful, avoid sensational or unsupported claims, and keep it concise.",
    "descriptionKo": "한국어 YouTube 설명문. 4~7개 짧은 문단으로 작성. 첫 2문장은 핵심 사건과 시청 이유를 명확히 설명하고, 이후 영상에서 다루는 주요 쟁점과 역사적 맥락을 소개. 사실로 확인되지 않은 주장이나 음모론은 단정하지 말 것. 마지막에 채널 성격에 맞는 자연스러운 구독 유도 1문장과 관련 해시태그 3개 포함.",
    "descriptionEn": "Natural English YouTube documentary description in 4 to 7 short paragraphs. Open with the core historical event and why it matters, explain the main questions and historical context covered in the video, avoid unsupported or sensational claims, then end with one natural subscription sentence and 3 relevant hashtags.",
    "tagsKo": ["주제 핵심키워드", "사건명", "인물명", "연도", "지역", "역사", "역사다큐", "다큐멘터리", "관련검색어1", "관련검색어2", "관련검색어3", "관련검색어4"],
    "tagsEn": ["core topic", "event name", "person name", "year", "location", "history", "history documentary", "documentary", "related search term 1", "related search term 2", "related search term 3", "related search term 4"]
  },`;

if (!s.includes(oldBlock)) {
    throw new Error(
        "DIRECTOR METADATA BLOCK NOT FOUND"
    );
}

s =
    s.replace(
        oldBlock,
        newBlock
    );

fs.writeFileSync(
    file,
    s,
    "utf8"
);

console.log(
    "LONGFORM METADATA PROMPT UPGRADED"
);

