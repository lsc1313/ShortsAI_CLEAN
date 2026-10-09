# History Shorts quality v1 — validation plan

Branch: history-quality-v1. Do not merge into main before validation.

## Scope
- Director: 25–60 second variable duration; substantive ranking explanations.
- Video engine: choose video by path extension, not missing metadata fields.
- History: fail when the corresponding scene has no media instead of borrowing adjacent scene media.
- Keep image paths as strings for makeScene(); filter out video paths when video rendering falls back.

## Required tests on PC
1. Syntax: `node --check modules/video.js` and `node --check modules/history/director.js`.
2. Generate one History GLOBAL and one History RANKING preview without publishing.
3. Confirm every scene has matching media and narration; missing media must fail closed.
4. Verify an MP4 winner renders as video, and a video render failure with a valid still falls back to the still.
5. Check audio, subtitles, duration, scene count, and ending frame.
6. Run shopping/hotdeal and longform smoke tests before merge because video.js is shared.
7. Confirm automatic publishing remains disabled during tests.

## Known limitations
- Media relevance is not yet validated semantically; stock footage may still be unrelated.
- No live rendering test has run from this GitHub-only edit.
- Existing production branch remains unchanged.
