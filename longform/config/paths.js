import fs from "node:fs";
import path from "node:path";

export const BASE_DATA_ROOT =
  process.env.LONGFORM_DATA_ROOT ||
  "D:/ShortsAI_DATA/longform";

export const DATA_ROOT =
  process.env.LONGFORM_JOB_ROOT ||
  BASE_DATA_ROOT;

export const PATHS = {
  root: DATA_ROOT,
  audioKo: path.join(DATA_ROOT, "tts-ko"),
  audioEn: path.join(DATA_ROOT, "tts-en"),
  subtitlesKo: path.join(DATA_ROOT, "subtitles-ko"),
  subtitlesEn: path.join(DATA_ROOT, "subtitles-en"),
  visuals: path.join(DATA_ROOT, "visuals"),
  renderRuns: path.join(DATA_ROOT, "visuals", "render-runs"),
  state: path.join(BASE_DATA_ROOT, "state")
};

for (const dir of Object.values(PATHS)) {
  fs.mkdirSync(dir, { recursive: true });
}

export default PATHS;
