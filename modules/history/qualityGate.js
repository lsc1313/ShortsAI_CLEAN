import fs from "fs";


// Conservative topic/visual preflight. This is NOT independent fact checking.
export function validateHistoryStoryPlan(topic, director) {
    const scenes = director?.scenes || [];
    if (!scenes.length) throw new Error("[HISTORY STORY QC] No scenes");
    const narration = scenes.map(s => String(s.tts || s.script || "")).join(" ");
    const title = String(director?.title || "");
    const input = String(topic || "").replace(/\\s+/g, "");
    // A named event must remain the story, not a loosely related tourist anecdote.
    if (/폼페이/.test(input) && /(최후|멸망|폭발|79년)/.test(input)) {
        if (!/폼페이/.test(title + narration) ||
            !/(베수비오|화산|폭발|화산재|서기\\s*79|79년|매몰|분화)/.test(narration)) {
            throw new Error("[HISTORY STORY QC] Requested Pompeii eruption topic drifted to a different story");
        }
    }
    const seenWorks = new Map();
    for (const [index, scene] of scenes.entries()) {
        const asset = scene.preflightAsset;
        if (!asset?.file || !asset?.sourceUrl || !asset?.title) {
            throw new Error(`[HISTORY STORY QC] Scene ${index + 1} missing grounded asset metadata`);
        }
        // Archive entries may have different URLs but depict the same artwork.
        const normalized = String(asset.title).toLowerCase()
            .replace(/\\b(detail|crop|cropped|stamp|postcard|reproduction|painting|picture|image|photo|photograph|file)\\b/g, " ")
            .replace(/[^a-z0-9가-힣]+/g, " ").trim();
        if (normalized.length >= 12 && seenWorks.has(normalized)) {
            throw new Error(`[HISTORY STORY QC] Scene ${index + 1} repeats archive work from scene ${seenWorks.get(normalized)}`);
        }
        if (normalized.length >= 12) seenWorks.set(normalized, index + 1);
    }
    console.log("[HISTORY STORY QC] PASS: topic anchor and basic artwork duplication checks");
    return true;
}

// Local, zero-API-call safety gate for History Shorts.
// This does not verify historical accuracy or inspect pixels.
export function validateHistoryProduction(director, images, voices, video = null) {
    const scenes = director?.scenes;
    if (!Array.isArray(scenes) || scenes.length === 0) {
        throw new Error("[HISTORY QC] No scenes");
    }
    if (!Array.isArray(images) || !Array.isArray(voices)) {
        throw new Error("[HISTORY QC] Missing media or narration arrays");
    }
    for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        if (!String(scene?.tts || scene?.voice || scene?.script || "").trim()) {
            throw new Error(`[HISTORY QC] Scene ${i + 1}: missing narration`);
        }
        if (!String(scene?.subtitle || "").trim()) {
            throw new Error(`[HISTORY QC] Scene ${i + 1}: missing subtitle`);
        }
        if (!images.some(img => Number(img?.scene) === i + 1 && img?.file && fs.existsSync(img.file))) {
            throw new Error(`[HISTORY QC] Scene ${i + 1}: missing visual`);
        }
    }
    if (voices.length !== scenes.length || voices.some(v => !v?.file || !fs.existsSync(v.file))) {
        throw new Error("[HISTORY QC] Narration count or audio files do not match scenes");
    }
    if (video !== null && (!video?.file || !fs.existsSync(video.file) || fs.statSync(video.file).size < 10000)) {
        throw new Error("[HISTORY QC] Rendered video missing or too small");
    }
    console.log(`[HISTORY QC] PASS: ${scenes.length} scenes, ${images.length} media`);
    return true;
}
