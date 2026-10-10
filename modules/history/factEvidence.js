import { callAI } from "../ai/index.js";

function parseJson(text) {
    return JSON.parse(String(text || "").replace(/^\`\`\`(?:json)?/i, "").replace(/\`\`\`$/i, "").trim());
}

async function fetchWikiExtract(topic, lang) {
    const endpoint = new URL(`https://${lang}.wikipedia.org/w/api.php`);
    endpoint.searchParams.set("action", "query");
    endpoint.searchParams.set("generator", "search");
    endpoint.searchParams.set("gsrsearch", topic);
    endpoint.searchParams.set("gsrlimit", "3");
    endpoint.searchParams.set("prop", "extracts|info");
    endpoint.searchParams.set("explaintext", "1");
    endpoint.searchParams.set("exintro", "1");
    endpoint.searchParams.set("inprop", "url");
    endpoint.searchParams.set("format", "json");
    endpoint.searchParams.set("origin", "*");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
        const response = await fetch(endpoint, { signal: controller.signal, headers: { "User-Agent": "ShortsAI-HistoryResearch/1.0 (educational preview)" } });
        if (!response.ok) throw new Error(`Wikipedia HTTP ${response.status}`);
        const data = await response.json();
        return Object.values(data?.query?.pages || {}).filter(p => p.extract && p.fullurl)
            .map(p => ({ title: p.title, url: p.fullurl, excerpt: p.extract.slice(0, 4200) }));
    } finally { clearTimeout(timer); }
}

export async function collectHistoryEvidence(topic) {
    const sources = [];
    for (const lang of ["ko", "en"]) {
        try { sources.push(...await fetchWikiExtract(topic, lang)); }
        catch (error) { console.log("[HISTORY FACT QC] Source unavailable:", lang, error.message); }
    }
    if (!sources.length) throw new Error("[HISTORY FACT QC] No independent text references found");
    return sources;
}

/**
 * Independent retrieved-text cross-check for History narration.
 * Wikipedia is a secondary reference, not conclusive historical proof.
 * Fail closed when references are missing or claims are not supported.
 */
export async function checkHistoryEvidence(topic, director) {
    const scenes = director?.scenes || [];
    if (!scenes.length) throw new Error("[HISTORY FACT QC] No scenes");
    const sources = await collectHistoryEvidence(topic);
    const prompt = `You are a strict historical evidence auditor, not a scriptwriter.
Only the reference excerpts below may support a claim. Do not use your memory.
Check every factual assertion in every scene, including dates, quantities, causes, and
claims about what historical people knew or believed. If a claim is missing from the
excerpts, mark the scene unsupported. Do not assume images prove facts.
Topic: ${JSON.stringify(topic)}
Sources: ${JSON.stringify(sources)}
Scenes: ${JSON.stringify(scenes.map((s, i) => ({ scene: i + 1, narration: s.tts || s.script })))}
Return JSON only: {"scenes":[{"scene":1,"supported":true,"sourceUrls":["exact URL from Sources"],"reason":"brief explanation"}]}.
Each scene must have one entry. supported=true ONLY when all material claims in that
scene are directly supported by cited excerpts. Otherwise supported=false.
Never invent URLs or facts.`;
    const result = parseJson(await callAI(prompt));
    const assessments = result?.scenes;
    if (!Array.isArray(assessments) || assessments.length !== scenes.length) {
        throw new Error("[HISTORY FACT QC] Invalid audit response");
    }
    const allowed = new Set(sources.map(s => s.url));
    for (let i = 0; i < scenes.length; i++) {
        const check = assessments.find(x => x.scene === i + 1);
        if (!check || check.supported !== true || !Array.isArray(check.sourceUrls) ||
            !check.sourceUrls.length || !check.sourceUrls.every(url => allowed.has(url))) {
            throw new Error(`[HISTORY FACT QC] Scene ${i + 1} lacks supporting retrieved evidence: ${check?.reason || "missing assessment"}`);
        }
        scenes[i].factReferences = check.sourceUrls;
    }
    console.log(`[HISTORY FACT QC] PASS: ${scenes.length} scenes cross-checked against ${sources.length} retrieved encyclopedia excerpts (not definitive historical proof)`);
}
