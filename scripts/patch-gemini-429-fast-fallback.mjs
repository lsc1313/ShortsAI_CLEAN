import fs from "node:fs";

const file = "./modules/ai/gemini.js";

let s = fs.readFileSync(
    file,
    "utf8"
);

const oldBlock = `                if (
                    status === 429 ||
                    (
                        status &&
                        status >= 500
                    )
                ) {`;

const newBlock = `                if (
                    status === 429
                ) {

                    console.log(
                        \`[Gemini quota/rate limit] \${model} HTTP 429 -> next model\`
                    );

                    break;
                }

                if (
                    status &&
                    status >= 500
                ) {`;

if (!s.includes(oldBlock)) {
    throw new Error(
        "GEMINI 429 TARGET NOT FOUND"
    );
}

s = s.replace(
    oldBlock,
    newBlock
);

s = s.replace(
`                429 / 서버 오류
                같은 모델을 일정 시간 후 재시도`,
`                429 = 즉시 다음 모델
                서버 오류 = 같은 모델 재시도`
);

fs.writeFileSync(
    file,
    s,
    "utf8"
);

console.log(
    "GEMINI 429 FAST FALLBACK PATCHED"
);
