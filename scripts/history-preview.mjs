import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createShort } from "../modules/createShort.js";

// Deliberately never loads channels.json: this run must not need credentials.
const topic = process.argv.slice(2).join(" ").trim();
if (!topic) {
    console.error('Usage: node scripts/history-preview.mjs "역사 주제"');
    process.exitCode = 2;
} else {
    const running = path.resolve("media", ".history-preview-running");
    if (fs.existsSync(running)) {
        console.error("[HISTORY PREVIEW] Another preview appears to be running. Check before removing lock.");
        process.exitCode = 2;
    } else {
        fs.mkdirSync(path.dirname(running), { recursive: true });
        fs.writeFileSync(running, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
        try {
            const result = await createShort(topic, { name: "history" }, { previewOnly: true });
            if (!result?.previewOnly || !result?.video || !fs.existsSync(result.video)) {
                throw new Error("History preview did not produce a video");
            }
            const output = path.resolve("history-preview-output");
            fs.mkdirSync(output, { recursive: true });
            const dest = path.join(output, `history-preview-${Date.now()}.mp4`);
            fs.copyFileSync(result.video, dest);
            const manifest = dest.replace(/\.mp4$/, ".json");
            fs.writeFileSync(manifest, JSON.stringify({
                topic, video: dest,
                title: result.director?.title,
                scenes: result.director?.scenes?.map((scene, i) => ({
                    scene: i + 1, tts: scene.tts, subtitle: scene.subtitle,
                    coreSubject: scene.coreSubject, imageQueries: scene.imageQueries,
                    imageFiles: result.images.filter(img => Number(img.scene) === i + 1).map(img => img.file)
                }))
            }, null, 2));
            console.log("[HISTORY PREVIEW] SAVED:", dest);
            console.log("[HISTORY PREVIEW] REPORT:", manifest);
            console.log("[HISTORY PREVIEW] No uploads attempted.");
        } catch (error) {
            console.error("[HISTORY PREVIEW] FAILED:", error?.stack || error);
            process.exitCode = 1;
        } finally {
            fs.rmSync(running, { force: true });
        }
    }
}
