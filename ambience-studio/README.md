# Ambience Studio — production line stage 1

Independent audio preview pipeline on main. Existing ambience-test/Rain V2 and the ShortsAI scheduler remain unchanged.

Requirements: Node.js, FFmpeg on PATH. For rain: existing D:/ShortsAI_DATA/ambience-library/rain/manifest.json and source files.

Run from repository root:
- `node ambience-studio/produce.mjs rain 60`
- `node ambience-studio/produce.mjs music 60`

Output: `D:/ShortsAI_DATA/ambience-studio/output/` (override root with SHORTSAI_DATA_ROOT).

The rain preview reuses the Rain V2 source library, with file matching and stereo normalization. The music preview now uses an original deterministic C–Am–F–G chord and melody synthesizer (music-engine.mjs). It remains a synthetic prototype, NOT a finished acoustic piano recording. Listen and validate quality before release. No upload or scheduler integration is performed. All previews are blocked from automatic upload. Review source licenses and audio quality before release.
