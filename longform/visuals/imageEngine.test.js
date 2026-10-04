import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import axios from "axios";
import { buildImagePayload, validateImageResult } from "./runLongformImageEngine.js";
// Fake keys enable video providers too, so an accidental video search is observable.
process.env.PIXABAY_API_KEY = "test-only";
process.env.PEXELS_API_KEY = "test-only";
const { providers } = await import("../../modules/image/provider.js");
const { searchImage } = await import("../../modules/image/search.js");
const { createImages } = await import("../../modules/engine/imageEngine.js");

const data = {
    topic: "Test documentary",
    chapters: Array.from({ length: 8 }, (_, i) => ({
        number: i + 1, title: `Chapter ${i + 1}`, narration: "Existing narration",
        images: [{ query: `archive map ${i}`, purpose: "map" }, { query: `forest ${i}`, purpose: "forest" }]
    }))
};

test("adapter rejects incomplete queries before any engine work", () => {
    const invalid = structuredClone(data);
    delete invalid.chapters[3].images;
    assert.throws(() => buildImagePayload(invalid), /Chapter 4/);
    assert.deepEqual(buildImagePayload(data).scenes[0].imageQueries, ["archive map 0", "forest 0"]);
});

test("real shared engine: exact queries, 16 images, no video, isolated output; Shorts providers retained", async () => {
    const calls = [];
    const requests = [];
    const originals = providers.map(provider => provider.search);
    const originalGet = axios.get;
    const cwd = process.cwd();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "longform-image-test-"));
    try {
        for (const provider of providers) {
            provider.search = async query => {
                calls.push([provider.name, query]);
                return [{ url: `https://example.test/${provider.name}/${encodeURIComponent(query)}`,
                    tags: "historic city", width: 1920, height: 1080, score: 100 }];
            };
        }
        axios.get = async (url, options) => {
            requests.push({ url, type: options?.responseType });
            assert.equal(options?.responseType, "arraybuffer", `Unexpected request (possibly video): ${url}`);
            return { data: Buffer.alloc(6000, 1) };
        };
        process.chdir(dir);
        const result = await createImages(buildImagePayload(data));
        validateImageResult(result);
        assert.equal(result.images.length, 16);
        assert.deepEqual(result.images.map(image => image.keyword), data.chapters.flatMap(c => c.images.map(i => i.query)));
        assert.equal(calls.length, 32);
        assert.equal(requests.length, 16);
        assert.ok(requests.every(request => request.type === "arraybuffer"));
        assert.ok(calls.every(([provider]) => provider !== "Pollinations"));
        assert.ok(result.images.every(image => path.resolve(image.file).startsWith(dir + path.sep)));
        assert.throws(() => validateImageResult({ images: result.images.slice(1) }), /expected 2 images/);
        calls.length = 0;
        await searchImage("exact query", { mediaMode: "image", coreSubject: "exact query", imageQueries: ["exact query"] });
        assert.deepEqual(calls, [["Pixabay", "exact query"], ["Pexels", "exact query"]]);
        calls.length = 0;
        await searchImage("shorts query", { searchSubject: "shorts subject" });
        assert.deepEqual([...new Set(calls.map(([provider]) => provider))], ["Pixabay", "Pexels", "Pollinations"]);
        assert.ok(calls.some(([, query]) => query === "shorts subject"));
        // Default Shorts still searches video and lets it win the media competition.
        requests.length = 0;
        axios.get = async (url, options) => {
            requests.push(url);
            if (url.includes("/api/videos/")) return { data: { hits: [{
                tags: "historic city", likes: 1000, duration: 10,
                videos: { large: { url: "https://example.test/stock.mp4", width: 1920, height: 2400 } }
            }] } };
            if (url.includes("/videos/search")) return { data: { videos: [] } };
            assert.equal(options?.responseType, "arraybuffer");
            return { data: Buffer.alloc(12000, 1) };
        };
        fs.mkdirSync("media/video", { recursive: true });
        const shorts = await createImages({ title: "Shorts", scenes: [{ imageQueries: ["shorts city"], imageLimit: 1 }] });
        assert.equal(shorts.images[0].mediaType, "video");
        assert.ok(requests.some(url => url.includes("/api/videos/")));
        assert.ok(requests.some(url => url.includes("/videos/search")));
    } finally {
        process.chdir(cwd);
        providers.forEach((provider, i) => { provider.search = originals[i]; });
        axios.get = originalGet;
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
