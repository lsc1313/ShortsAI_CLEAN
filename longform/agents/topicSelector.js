import { DATA_ROOT } from "../config/paths.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(DATA_ROOT, "topic-research.json");
const OUTPUT = path.join(DATA_ROOT, "topic-selection.json");

function readJSON(file) {
    return JSON.parse(
        fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")
    );
}

function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
}

function scoreTopic(item) {

    const y = item.youtube || {};

    const results = Number(y.resultCount || 0);
    const totalViews = Number(y.totalViews || 0);
    const maxViews = Number(y.maxViews || 0);
    const longformCount = Number(y.longformCount || 0);

    /*
        DEMAND
        최근 30일 조회수 수요.
        로그 스케일을 사용해서 초대형 영상 하나가
        전체 점수를 독식하지 못하게 한다.
    */

    const demandScore = clamp(
        Math.log10(totalViews + 1) * 18
    );

    /*
        DEPTH
        실제 10분+ 영상이 존재하면
        롱폼으로 확장 가능한 주제로 판단.
    */

    const depthScore = clamp(
        longformCount * 12
    );

    /*
        OPPORTUNITY
        검색 결과가 너무 많으면 경쟁,
        너무 없으면 수요 검증 부족.
        3~8개 정도를 좋은 구간으로 본다.
    */

    let opportunityScore = 0;

    if (results === 0) {
        opportunityScore = 5;
    }
    else if (results <= 2) {
        opportunityScore = 45;
    }
    else if (results <= 5) {
        opportunityScore = 90;
    }
    else if (results <= 8) {
        opportunityScore = 75;
    }
    else {
        opportunityScore = 55;
    }

    /*
        DISTRIBUTION
        조회수가 한 영상에만 몰려 있으면 감점.
    */

    let distributionScore = 0;

    if (totalViews > 0) {
        const dominance =
            maxViews / totalViews;

        distributionScore =
            clamp((1 - dominance) * 100);
    }

    /*
        최종 가중치
    */

    const finalScore =
        demandScore * 0.40 +
        depthScore * 0.25 +
        opportunityScore * 0.20 +
        distributionScore * 0.15;

    return {
        demandScore:
            Math.round(demandScore * 10) / 10,

        depthScore:
            Math.round(depthScore * 10) / 10,

        opportunityScore:
            Math.round(opportunityScore * 10) / 10,

        distributionScore:
            Math.round(distributionScore * 10) / 10,

        finalScore:
            Math.round(finalScore * 10) / 10
    };
}

export function selectTopics() {

    const data = readJSON(INPUT);

    const scored = (data.topics || [])
        .map(item => ({
            ...item,
            scores: scoreTopic(item)
        }))
        .sort(
            (a, b) =>
                b.scores.finalScore -
                a.scores.finalScore
        );

    const finalists = scored.slice(0, 10);

    const selected =
        finalists.length
            ? finalists[0]
            : null;

    const output = {
        selectedAt:
            new Date().toISOString(),

        genre:
            data.genre,

        selected,

        finalists,

        allRanked: scored.map(
            (item, index) => ({
                rank: index + 1,
                id: item.id,
                topic: item.topic,
                scores: item.scores,
                youtube: {
                    resultCount:
                        item.youtube?.resultCount || 0,
                    totalViews:
                        item.youtube?.totalViews || 0,
                    maxViews:
                        item.youtube?.maxViews || 0,
                    longformCount:
                        item.youtube?.longformCount || 0
                }
            })
        )
    };

    fs.writeFileSync(
        OUTPUT,
        JSON.stringify(output, null, 2),
        "utf8"
    );

    console.log("");
    console.log("================================");
    console.log("TOPIC SELECTION");
    console.log("================================");

    finalists.forEach((item, index) => {

        console.log(
            `${index + 1}. ` +
            `[${item.scores.finalScore}] ` +
            item.topic
        );

    });

    console.log("");
    console.log("SELECTED:");
    console.log(
        selected
            ? selected.topic
            : "NONE"
    );

    console.log("");
    console.log(`SAVED: ${OUTPUT}`);

    return output;
}

if (
    process.argv[1] &&
    path.resolve(process.argv[1]) === __filename
) {
    selectTopics();
}
