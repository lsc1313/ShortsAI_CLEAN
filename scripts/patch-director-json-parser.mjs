import fs from "node:fs";

const file = "./longform/director.js";

let s = fs.readFileSync(file, "utf8");

const pattern =
    /function parseJSON\(text\) \{[\s\S]*?\r?\n\}\r?\n\r?\nfunction charCount/;

if (!pattern.test(s)) {
    throw new Error("DIRECTOR parseJSON target not found");
}

const replacement = `function parseJSON(text) {

    const cleaned = String(text)
        .replace(/\`\`\`json/gi, "")
        .replace(/\`\`\`/g, "")
        .trim();

    /*
    먼저 응답 전체가 정상 JSON이면 그대로 사용
    */
    try {
        return JSON.parse(cleaned);
    }
    catch {
        // 아래 balanced JSON extractor로 복구
    }

    /*
    Gemini가 JSON 뒤에 설명이나 두 번째 JSON을 붙여도
    첫 번째 완성된 JSON 객체/배열만 정확히 추출한다.
    문자열 내부의 { } [ ] 문자는 무시한다.
    */
    let start = -1;

    for (let i = 0; i < cleaned.length; i++) {
        if (
            cleaned[i] === "{" ||
            cleaned[i] === "["
        ) {
            start = i;
            break;
        }
    }

    if (start === -1) {
        throw new Error("AI JSON start not found");
    }

    const stack = [];
    let inString = false;
    let escaped = false;

    for (
        let i = start;
        i < cleaned.length;
        i++
    ) {

        const ch = cleaned[i];

        if (inString) {

            if (escaped) {
                escaped = false;
                continue;
            }

            if (ch === "\\\\") {
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

        if (
            ch === "}" ||
            ch === "]"
        ) {

            const expected =
                stack.pop();

            if (expected !== ch) {
                throw new Error(
                    "AI JSON bracket mismatch"
                );
            }

            if (stack.length === 0) {

                const jsonText =
                    cleaned.slice(
                        start,
                        i + 1
                    );

                return JSON.parse(
                    jsonText
                );
            }
        }
    }

    throw new Error(
        "AI JSON incomplete"
    );
}

function charCount`;

s = s.replace(
    pattern,
    replacement
);

fs.writeFileSync(
    file,
    s,
    "utf8"
);

console.log(
    "DIRECTOR JSON PARSER PATCHED"
);
