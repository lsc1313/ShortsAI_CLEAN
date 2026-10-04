import test from "node:test";
import assert from "node:assert/strict";
import { parseSrt, normalizeCues, makeSrt, restoreSourceText } from "./subtitleEn.js";
import { checkSubtitles } from "../visuals/renderLongform.js";

test("Edge sentence splitting preserves every word and removes overlaps with gaps", () => {
    const raw = parseSrt("1\r\n00:00:00,100 --> 00:00:08,500\r\nThis is a long sentence about the secret city and its history behind barbed wire.\r\n\r\n2\r\n00:00:08,450 --> 00:00:10,000\r\nThe next sentence.\r\n");
    const fixed = normalizeCues(raw, 9900);
    assert.equal(fixed.map(cue => cue.text).join(" "), raw.map(cue => cue.text).join(" "));
    assert.ok(fixed.every(cue => cue.text.length <= 40 && cue.end <= 9900));
    for (let i = 1; i < fixed.length; i++) assert.ok(fixed[i].start - fixed[i - 1].end >= 20);
    assert.equal(checkSubtitles(makeSrt(fixed), 9.9), fixed.length);
    assert.deepEqual(parseSrt(makeSrt(fixed)), fixed);
});

test("malformed or impossible Edge timing fails rather than dropping words", () => {
    assert.throws(() => parseSrt("missing timing"));
    assert.throws(() => normalizeCues([{ start: 0, end: 1000, text: "One" }, { start: 20, end: 2000, text: "Two" }], 2000));
});

test("restore Edge's omitted closing quote without changing source words or timing", () => {
    const cues = [{ start: 100, end: 1000, text: 'A "secret city.' }, { start: 1100, end: 2000, text: "The next sentence." }];
    const result = restoreSourceText(cues, 'A "secret city."\n\nThe next sentence.');
    assert.equal(result[0].text, 'A "secret city."');
    assert.equal(result[1].start, 1100);
    assert.throws(() => restoreSourceText(cues, 'A "different city." The next sentence.'));
    assert.throws(() => restoreSourceText(cues, 'A "secret city." The next sentence. Missing words.'));
});
