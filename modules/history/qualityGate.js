import fs from "fs";
import { Jimp } from "jimp";


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


/**
 * Fast visual similarity gate, History only.
 * 9x8 difference hash detects resized/re-encoded versions of the same artwork.
 * This does not establish historical accuracy or semantic visual relevance.
 */
async function imageDifferenceHash(file) {
    const image = await Jimp.read(file);
    image.resize({ w: 9, h: 8 }).greyscale();
    let bits = 0n;
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const left = image.getPixelColor(x, y) >>> 24;
            const right = image.getPixelColor(x + 1, y) >>> 24;
            bits = (bits << 1n) | (left > right ? 1n : 0n);
        }
    }
    return bits;
}
function bitDistance(a, b) {
    let value = a ^ b;
    let count = 0;
    while (value) { count++; value &= value - 1n; }
    return count;
}
export async function validateHistoryVisualSimilarity(director) {
    const seen = [];
    for (const [index, scene] of (director?.scenes || []).entries()) {
        const file = scene?.preflightAsset?.file;
        if (!file || !fs.existsSync(file)) {
            throw new Error(`[HISTORY VISUAL QC] Scene ${index + 1}: missing downloaded image`);
        }
        let hash;
        try { hash = await imageDifferenceHash(file); }
        catch (error) { throw new Error(`[HISTORY VISUAL QC] Scene ${index + 1}: cannot inspect image: ${error.message}`); }
        for (const previous of seen) {
            const distance = bitDistance(hash, previous.hash);
            if (distance <= 5) {
                throw new Error(`[HISTORY VISUAL QC] Scene ${index + 1} visually repeats scene ${previous.scene} (dHash distance=${distance})`);
            }
        }
        seen.push({ scene: index + 1, hash });
    }
    console.log(`[HISTORY VISUAL QC] PASS: ${seen.length} distinct image fingerprints`);
}
export function validateHistoryClaimRisk(director) {
    const patterns = [
        { re: /화산(이라는)?\\s*(개념|단어).{0,25}(없었|몰랐|생소|존재하지)/, label: "unsupported ancient volcano knowledge claim" },
        { re: /(주민|시민|사람들).{0,35}(단지|그저|모두|아무도).{0,35}(여겼|생각했|몰랐)/, label: "unsupported collective psychology" },
        { re: /하룻밤\\s*사이에?\\s*.{0,30}(매몰|사라졌)/, label: "oversimplified eruption timeline" }
    ];
    for (const [index, scene] of (director?.scenes || []).entries()) {
        const narration = String(scene.tts || scene.script || "");
        const hit = patterns.find(p => p.re.test(narration));
        if (hit) throw new Error(`[HISTORY CLAIM QC] Scene ${index + 1}: ${hit.label}. Verify sources and rewrite before production.`);
    }
    console.log("[HISTORY CLAIM QC] PASS: no known high-risk phrasing (not independent fact verification)");
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
