import fs from "fs";

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
