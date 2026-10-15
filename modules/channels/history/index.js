import { callAI } from "../../ai/index.js";
import duplicateService from "../../services/duplicateService.js";
import scoringService from "../../services/scoringService.js";

// History chooses its own subject. No predefined countries, eras, events,
// examples, subject pools, or trending keywords are injected.
export async function generateTopics(request = {}) {
    const count = Math.max(1, Math.min(10, Number(request?.count) || 1));
    const prompt = [
        "역사 전체를 대상으로 교육적 가치와 흥미가 높은 Shorts 주제를 자율적으로 발굴하라.",
        "시대, 지역, 인물, 국가, 분야, 사건 유형을 사전에 제한하거나 특정 방향을 우대하지 마라.",
        "실제로 존재한 역사적 사실을 중심으로, 독립적으로 검증 가능한 구체적 주제를 선정하라.",
        "제작하기 쉬운 시각 자료가 있는 주제만 반복 선정하지 마라.",
        "주제 간 의미가 중복되지 않게 하고 JSON 외의 문장은 출력하지 마라.",
        `정확히 ${count}개의 주제를 생성하라.`,
        '{"topics":["주제 문자열"]}'
    ].join("\n");
    let parsed;
    try {
        const raw = String(await callAI(prompt)).replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
        parsed = JSON.parse(raw);
    } catch (error) {
        console.warn("[HISTORY TOPIC] Autonomous selection failed:", error.message);
        return [];
    }
    if (!Array.isArray(parsed?.topics)) {
        console.warn("[HISTORY TOPIC] Invalid topic selection response");
        return [];
    }
    const candidates = parsed.topics
        .filter(topic => typeof topic === "string" && topic.trim())
        .map(topic => ({
            topic: topic.trim(), category: "history", channel: "History",
            trend: false, hot: false, source: "history_autonomous",
            trendScore: 0, keywords: []
        }));
    const unique = await duplicateService.filterDuplicates(candidates);
    const scored = await scoringService.scoreTopics(unique, {
        category: "history", name: "History"
    });
    console.log("[HISTORY TOPIC] Autonomous candidates:", scored.length);
    return scored.slice(0, count);
}

export default { generateTopics };
