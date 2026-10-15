import { runChannel } from "../common.js";
import duplicateService from "../../services/duplicateService.js";
import scoringService from "../../services/scoringService.js";

// History-only, non-trending fallback. Concrete historical events are easier
// to research and illustrate than arbitrary subject + angle combinations.
// These are candidate topics, NOT claims that the events are trending.
const ARCHIVE_READY_TOPICS = [
    "서기 79년 베수비오 화산 폭발과 폼페이",
    "1912년 타이타닉 침몰과 구명보트",
    "1666년 런던 대화재",
    "1906년 샌프란시스코 대지진",
    "1937년 힌덴부르크 비행선 화재",
    "1883년 크라카타우 화산 폭발",
    "1815년 탐보라 화산 폭발",
    "1911년 남극점 도달 경쟁",
    "1969년 아폴로 11호 달 착륙",
    "1903년 라이트 형제 첫 동력 비행",
    "1989년 베를린 장벽 붕괴",
    "1940년 덩케르크 철수 작전",
    "1922년 투탕카멘 무덤 발견",
    "1914년 파나마 운하 개통"
];

export async function generateTopics(request) {
    const count = Math.max(1, Number(request?.count) || 1);
    const result = await runChannel({
        ...request,
        name: "History",
        category: "history"
    });

    if (result.length > 0) return result.slice(0, count);

    // Never promote unclassified YouTube titles to verified trends.
    // This fallback cannot bypass later Gemini evidence/visual quality gates.
    const candidates = ARCHIVE_READY_TOPICS.map(topic => ({
        topic, category: "history", channel: "History",
        trend: false, hot: false, source: "history_archive_fallback",
        trendScore: 0, keywords: []
    }));
    const unique = await duplicateService.filterDuplicates(candidates);
    const scored = await scoringService.scoreTopics(unique, {
        category: "history", name: "History"
    });
    console.log("[History] Trend unavailable; historical archive fallback:", scored.length);
    return scored.slice(0, count);
}

export default {
    generateTopics
};
