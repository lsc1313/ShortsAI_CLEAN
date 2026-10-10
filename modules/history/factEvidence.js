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
export async function checkHistoryEvidence(topic, director, referenceSources = null) {
    const scenes = director?.scenes || [];
    if (!scenes.length) throw new Error("[HISTORY FACT QC] No scenes");
    const sources = referenceSources || await collectHistoryEvidence(topic);
    // Bounded evidence-only repairs followed by independent re-audits.
    // Never bypass the evidence gate or fabricate references.
    for (let attempt = 0; attempt < 3; attempt++) {
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
    const failures = [];
    for (let i = 0; i < scenes.length; i++) {
        const check = assessments.find(x => x.scene === i + 1);
        if (!check || check.supported !== true || !Array.isArray(check.sourceUrls) ||
            !check.sourceUrls.length || !check.sourceUrls.every(url => allowed.has(url))) {
            failures.push({ scene: i + 1, reason: check?.reason || "missing assessment" });
        } else {
            scenes[i].factReferences = check.sourceUrls;
        }
    }
    if (!failures.length) {
        console.log(`[HISTORY FACT QC] PASS: ${scenes.length} scenes verified against ${sources.length} retrieved excerpts`);
        return true;
    }
    if (attempt === 2) {
        throw new Error(`[HISTORY FACT QC] Unverified after two evidence-based repairs: ${JSON.stringify(failures)}`);
    }
    console.log(`[HISTORY FACT QC] Evidence-only repair ${attempt + 1}/2:`, JSON.stringify(failures));
    const repairPrompt = `You are revising a historical video script based ONLY on supplied reference excerpts.
Topic: ${JSON.stringify(topic)}
References: ${JSON.stringify(sources)}
Scene scripts: ${JSON.stringify(scenes.map((scene, i) => ({ scene: i + 1, tts: scene.tts || scene.script, assetTitle: scene.preflightAsset?.title })))}
Unsupported scenes and reasons: ${JSON.stringify(failures)}
Return ONLY JSON {"scenes":[{"scene":1,"tts":"revised Korean narration","subtitle":"matching concise Korean subtitle"}]} for exactly the unsupported scenes.
Keep the requested historical subject and the same selected images.
For EACH failed scene: identify every unsupported claim mentioned in its failure reason;
REMOVE that claim entirely or replace it with the precise weaker statement explicitly
present in the provided reference. Do NOT substitute a synonym that makes the same
unsupported claim. For example, if a source says "one of the largest", do not write
"the largest"; if the source describes a remaining passenger count, do not infer what
each passenger did next. This rule applies to ANY historical topic.
Write 1-2 short factual Korean sentences per scene. Use only facts explicitly stated
in the references; no dramatic embellishment, unverified numbers, or invented causes.
If necessary, change the angle of the scene to a different source-supported fact.
Each revised scene must remain coherent with its assigned image. Do not change image selections.`;
    const revised = parseJson(await callAI(repairPrompt));
    if (!Array.isArray(revised?.scenes) || revised.scenes.length !== failures.length) {
        throw new Error("[HISTORY FACT QC] Invalid repair response");
    }
    for (const failed of failures) {
        const fix = revised.scenes.find(x => x.scene === failed.scene);
        if (!fix || typeof fix.tts !== "string" || !fix.tts.trim() ||
            typeof fix.subtitle !== "string" || !fix.subtitle.trim()) {
            throw new Error(`[HISTORY FACT QC] Missing valid repair for scene ${failed.scene}`);
        }
        scenes[failed.scene - 1].tts = fix.tts.trim();
        scenes[failed.scene - 1].subtitle = fix.subtitle.trim();
        delete scenes[failed.scene - 1].factReferences;
    }
    }
    throw new Error("[HISTORY FACT QC] Audit did not complete");
}
