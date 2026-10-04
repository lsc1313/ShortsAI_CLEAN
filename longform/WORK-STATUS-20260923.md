# Arzamas-16 longform continuation

Project: `C:\Users\CAN804\ShortsAI_CLEAN`, branch `longform-dev`.

## Preserved inputs

The current Korean script already had 16 image queries. Comparing it with
`data/longform-script.before-images.json` proved that only chapter `images`
had changed. No Director or image-query AI call was made in this session.
Neither script, original TTS files, nor existing Korean subtitles were changed.
Later in the session the user explicitly approved separate English Edge synthesis
and subtitle generation; those outputs are isolated from the original English MP3s.

Before editing, working copies and a 124-file SHA-256 preservation manifest
were saved under `data/work-backups/session-20260922-233352/`.
Only the two intentionally patched shared image modules differ from that manifest.
Other pre-existing Git changes were left intact. No commit or push was performed.

## Image integration

- `visuals/runLongformImageEngine.js` validates 8 chapters and exactly 2 queries each.
- Project environment loads before providers capture their keys.
- Each standalone run uses a fresh directory under `data/visuals/image-runs/`.
  The shared engine's relative media/cache writes stay inside that directory,
  protecting Shorts media. Result paths are absolute.
- In image mode, `modules/image.js` preserves Director query order.
- In image mode with explicit queries, `modules/image/search.js` searches each
  exact query without adding chapter titles or substituting coreSubject.
- Default Shorts ordering, fallback queries, Pollinations, and video competition remain.

Actual successful result:
`data/visuals/image-runs/run-8rB5fr/image-engine-result.json`.

Downloaded 16 files: 8 Pixabay and 8 Pexels, 2 per chapter.
Every logged competition had `VIDEO_CANDIDATES=0`; Pollinations was excluded.
SHA-256 comparison found 14 distinct files: chapters 1/8 share one photo,
and chapters 3/5 share one photo. These are background stock images, not
verified archival depictions of each narrated event.

## Rendering

`visuals/renderLongform.js` reuses the same image order for both languages,
splits each chapter in half using its actual audio duration, and rounds global
boundaries to frames so there are no cumulative gaps. A slow 6% zoom/pan,
1920×1080 crop, approved color treatment, upper title band, and existing fixed
Korean subtitles are applied. No bottom subtitle box is added.

Korean timing uses the chapter audio that generated the existing subtitles.
English timing uses the existing English chapter MP3 files.
Each render goes into a fresh directory; existing files are never replaced.

- Korean 12-second preview: `data/visuals/render-runs/ko-preview-2NGaGV/longform-ko-preview.mp4`.
- Preview frame and 16-image contact sheet are in the same directory.
- Korean full render directory: `data/visuals/render-runs/ko-full-pMhz20/`.
- Korean completed video: `data/visuals/render-runs/ko-full-pMhz20/longform-ko-full.mp4`.
  Verified H.264 1920×1080 at 25fps, 57,530 frames, 2301.200s video,
  2301.192s AAC audio, 960,080,413 bytes. Chapter 2 and chapter 8 frames checked.
- English timing plan: `data/visuals/render-runs/en-plan-DrSLaY/timeline.json`.
- Korean duration: 2301.192 seconds. English duration: 2315.400 seconds.
- All 875 fixed Korean subtitle cues passed strict overlap validation.
- NVIDIA encoding was unavailable due to driver/API mismatch; CPU libx264 is used.

English rendering requires an aligned English SRT. None was initially present.
The renderer fails explicitly if it is missing and never silently regenerates TTS.
After explicit user approval, `agents/subtitleEn.js` generated separate paired
audio/subtitles with en-US-ChristopherNeural at +0% under
`data/speech-runs/en-Ac1YCB/`. All eight chapter durations exactly match the old
English MP3 durations, but file hashes differ, so rendering uses the new paired audio.

Edge omitted some closing quotation marks from sentence boundaries. These were
restored from the existing script after verifying every word in order, without
another synthesis call. The source-verified manifest is
`data/speech-runs/en-Ac1YCB/speech-manifest-source.json`; its combined SRT is
`longform-en-source-fixed.srt` in that directory, with 1,096 nonoverlapping cues.
The generator now includes this source-text verification for subsequent runs.

English preview: `data/visuals/render-runs/en-preview-0O3eTT/longform-en-preview.mp4`.
English full render directory: `data/visuals/render-runs/en-full-kowYqk/`.
The renderer accepts an optional paired speech manifest, keeping audio and subtitle
selection together and leaving original TTS files intact.

## Validation

Syntax checks passed for the existing Director, query helper, adapter, and shared
image modules before changes. Seven automated tests pass after the integration:

1. Reject missing chapter image queries before engine work.
2. Exercise the shared engine with mocked network: exact 16-image ordering,
   no video requests in image mode, and preserved Shorts Pollinations/video selection.
3. Verify KR/EN image reuse, per-language durations, frame continuity, and subtitle offsets.
4. Reject overlapping/reversed subtitle cues and cues beyond the audio.
5. Split Edge sentences while preserving words and enforcing nonoverlapping gaps.
6. Reject malformed or impossible Edge timings without silently dropping words.
7. Restore omitted quote punctuation from the source and reject missing/changed words.

Real network search/download, approved English Edge synthesis, and both previews
were executed separately from mocked tests. Korean full-render verification is
recorded above; English full-render verification follows after completion.
