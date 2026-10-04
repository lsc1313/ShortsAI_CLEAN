import test from "node:test";
import assert from "node:assert/strict";
import { buildTimeline, checkSubtitles, videoFilter } from "./renderLongform.js";

const chapters = Array.from({ length: 8 }, (_, i) => ({ number: i + 1, title: `한국어 ${i}`, titleEn: `English ${i}` }));
const images = chapters.flatMap(chapter => [1, 2].map(slot => ({ scene: chapter.number, file: `${chapter.number}-${slot}.jpg`, keyword: "original query" })));

test("KR/EN share image order, use their own duration, and have no frame gaps", () => {
    const durations = [390.216, 364.248, 263.616, 176.376, 308.136, 283.368, 294.504, 220.728];
    const ko = buildTimeline(chapters, images, durations, "ko");
    const en = buildTimeline(chapters, images, durations.map(seconds => seconds * 1.01), "en");
    assert.equal(ko.segments.length, 16);
    assert.ok(Math.abs(ko.totalDuration - 2301.192) < 0.001);
    assert.deepEqual(ko.segments.map(segment => segment.file), en.segments.map(segment => segment.file));
    assert.notEqual(ko.totalFrames, en.totalFrames);
    for (const plan of [ko, en]) {
        for (let i = 1; i < plan.segments.length; i++) assert.equal(plan.segments[i - 1].endFrame, plan.segments[i].startFrame);
        assert.equal(plan.segments.reduce((sum, segment) => sum + segment.frames, 0), plan.totalFrames);
    }
    assert.equal(en.segments[0].title, "English 0");
    const filter = videoFilter(ko.segments[2], 2, true);
    assert.match(filter, /setpts=PTS\+390\.2\/TB/);
    assert.match(filter, /BorderStyle=1/);
    assert.match(filter, /setpts=PTS-STARTPTS/);
});

test("subtitle validator rejects overlaps, reversed cues, and cues past audio", () => {
    const first = "1\n00:00:00,100 --> 00:00:01,000\nHello\n\n";
    assert.equal(checkSubtitles(first, 2), 1);
    assert.throws(() => checkSubtitles(first + "2\n00:00:00,999 --> 00:00:01,500\nOverlap", 2));
    assert.throws(() => checkSubtitles("1\n00:00:01,100 --> 00:00:01,000\nReverse", 2));
    assert.throws(() => checkSubtitles(first, 0.5));
});
