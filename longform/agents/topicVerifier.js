import { DATA_ROOT } from "../config/paths.js";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { callGemini } from "../../modules/ai/gemini.js";

const __filename = fileURLToPath(import.meta.url);

const INPUT =
    path.join(
        DATA_ROOT,
        "topic-selection.json"
    );

const OUTPUT =
    path.join(
        DATA_ROOT,
        "topic-verification.json"
    );


function readJSON(file) {

    return JSON.parse(
        fs.readFileSync(
            file,
            "utf8"
        ).replace(/^\uFEFF/, "")
    );

}


function parseJSON(text) {

    const cleaned =
        String(text)
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

    const start =
        cleaned.indexOf("{");

    const end =
        cleaned.lastIndexOf("}");

    if (
        start === -1 ||
        end === -1
    ) {
        throw new Error(
            "Verification JSON not found"
        );
    }

    return JSON.parse(
        cleaned.slice(
            start,
            end + 1
        )
    );

}


async function verifyBatch(finalists) {

    const topics =
        finalists.map(
            (item, index) => ({
                id: index + 1,
                topic: item.topic,
                titleIdea:
                    item.titleIdea || ""
            })
        );


    const prompt = `
너는 역사 다큐멘터리 주제의 사실성 검증 담당자다.

중요:
- 외부 검색 도구를 사용하지 않는다.
- 모델이 확실히 알고 있는 역사적 지식 범위에서만 판단한다.
- 확실하지 않은 사실을 만들어내지 않는다.
- 애매하면 PASS를 주지 말고 FIX 또는 REJECT로 보수적으로 판정한다.
- 검증되지 않은 음모론이나 선정적인 표현을 사실처럼 인정하지 않는다.

아래 YouTube 역사 롱폼 후보 전체를 한 번에 검토한다.

후보:
${JSON.stringify(topics, null, 2)}

검증 기준:

1. 핵심 사건, 인물, 장소가 실제 역사에 존재하는가?
2. 연도나 시대적 배경이 명백히 잘못되지는 않았는가?
3. 서로 다른 사건이나 인물이 섞여 있지는 않은가?
4. 제목의 핵심 주장이 역사적으로 지나치게 단정적이지 않은가?
5. 전설, 가설, 소문, 음모론을 사실처럼 표현하지 않았는가?
6. 역사 롱폼 다큐멘터리로 확장 가능한 주제인가?
7. 모델의 지식만으로 신뢰성 있게 검토하기 어려운 경우 이를 솔직히 반영한다.

판정:

PASS
= 역사적으로 충분히 확립되어 있고 그대로 제작 가능

FIX
= 실제 사건이지만 표현, 연도, 인과관계 또는 과장된 주장을 수정하면 제작 가능

REJECT
= 핵심 전제가 허위이거나 심각하게 혼합되었거나,
  모델 지식만으로 사실성을 신뢰성 있게 판단하기 어려움

confidence:
0~100 정수.

correctedTopic:
- FIX면 사실에 맞게 수정한 주제
- PASS면 원래 주제를 그대로 사용 가능
- REJECT면 빈 문자열 가능

longformReady:
- PASS 또는 안전하게 수정 가능한 FIX면 true
- REJECT면 false

facts:
모델이 확실히 알고 있는 핵심 사실만 작성.
불확실한 내용을 만들어내지 말 것.

sourceSummary:
외부 검색이나 출처를 사용한 것처럼 작성하지 말 것.
판단 근거를 짧게 요약한다.

입력된 모든 id에 대해 정확히 하나씩 결과를 반환한다.

ONLY JSON:

{
  "results": [
    {
      "id": 1,
      "status": "PASS",
      "confidence": 90,
      "correctedTopic": "",
      "issues": [],
      "facts": [],
      "sourceSummary": "",
      "longformReady": true
    }
  ]
}
`;


    const response =
        await callGemini(prompt);

    const parsed =
        parseJSON(response);


    if (
        !Array.isArray(
            parsed.results
        )
    ) {
        throw new Error(
            "Verification results array missing"
        );
    }


    return parsed.results;

}



export async function verifyTopics(
    limit = 10
) {

    const data =
        readJSON(INPUT);

    const finalists =
        (data.finalists || [])
            .slice(0, limit);


    console.log("");
    console.log(
        "================================"
    );
    console.log(
        "BATCH TOPIC FACT VERIFICATION"
    );
    console.log(
        "================================"
    );

    console.log(
        `TOPICS: ${finalists.length}`
    );

    console.log(
        "GEMINI CALL: 1 (NO SEARCH)"
    );


    if (
        finalists.length === 0
    ) {
        throw new Error(
            "No topic finalists"
        );
    }


    const results =
        await verifyBatch(
            finalists
        );


    const resultMap =
        new Map(
            results.map(
                result => [
                    Number(result.id),
                    result
                ]
            )
        );


    const verified =
        finalists.map(
            (item, index) => {

                const verification =
                    resultMap.get(
                        index + 1
                    ) || {
                        status: "ERROR",
                        confidence: 0,
                        correctedTopic: "",
                        issues: [
                            "Verification result missing"
                        ],
                        facts: [],
                        sourceSummary: "",
                        longformReady: false
                    };


                return {
                    ...item,
                    verification
                };

            }
        );


    const usable =
        verified.filter(
            item =>
                (
                    item.verification.status ===
                        "PASS" ||

                    item.verification.status ===
                        "FIX"
                ) &&

                item.verification.longformReady ===
                    true
        );


    usable.sort(
        (a, b) =>
            Number(
                b.scores?.finalScore || 0
            ) -
            Number(
                a.scores?.finalScore || 0
            )
    );


    const selected =
        usable[0] || null;


    const output = {

        verifiedAt:
            new Date().toISOString(),

        genre:
            data.genre,

        geminiCalls: 1,

        verificationMode:
            "model_only_no_search",

        selected,

        verified

    };


    fs.writeFileSync(
        OUTPUT,
        JSON.stringify(
            output,
            null,
            2
        ),
        "utf8"
    );


    console.log("");
    console.log(
        "================================"
    );
    console.log(
        "VERIFICATION COMPLETE"
    );
    console.log(
        "================================"
    );


    for (
        const item of verified
    ) {

        console.log(
            `${item.verification.status} | ` +
            `${item.verification.confidence} | ` +
            `${item.scores?.finalScore ?? 0} | ` +
            item.topic
        );

    }


    console.log("");
    console.log(
        "FINAL SELECTED:"
    );

    console.log(
        selected
            ? (
                selected.verification
                    .correctedTopic ||
                selected.topic
            )
            : "NONE"
    );


    console.log("");
    console.log(
        `SAVED: ${OUTPUT}`
    );


    return output;

}


if (
    process.argv[1] &&
    path.resolve(
        process.argv[1]
    ) === __filename
) {

    const limit =
        Number(
            process.argv[2]
        ) || 10;


    verifyTopics(limit)
        .catch(error => {

            console.error(
                error
            );

            process.exit(1);

        });

}
