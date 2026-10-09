import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateHistoryProduction } from "../modules/history/qualityGate.js";

test("History QC rejects missing narration, subtitles, media, or voice alignment", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shorts-history-qc-"));
    try {
        const visual = path.join(dir, "visual.jpg");
        const voice = path.join(dir, "voice.mp3");
        const video = path.join(dir, "video.mp4");
        fs.writeFileSync(visual, Buffer.alloc(12000));
        fs.writeFileSync(voice, Buffer.alloc(12000));
        fs.writeFileSync(video, Buffer.alloc(12000));
        const director = { scenes: [{ tts: "이 사건은 실제로 일어났습니다.", subtitle: "실제 사건" }] };
        const images = [{ scene: 1, file: visual }];
        const voices = [{ scene: 1, file: voice }];
        assert.equal(validateHistoryProduction(director, images, voices, { file: video }), true);
        assert.throws(() => validateHistoryProduction(director, [], voices), /missing visual/);
        assert.throws(() => validateHistoryProduction(director, images, []), /Narration count/);
        assert.throws(() => validateHistoryProduction({ scenes: [{ tts: "", subtitle: "자막" }] }, images, voices), /missing narration/);
        assert.throws(() => validateHistoryProduction({ scenes: [{ tts: "음성", subtitle: "" }] }, images, voices), /missing subtitle/);
        assert.throws(() => validateHistoryProduction(director, images, voices, { file: path.join(dir, "missing.mp4") }), /Rendered video/);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
