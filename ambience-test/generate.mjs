import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { acquireVisual } from "./source.mjs";

const cfg = JSON.parse(fs.readFileSync(new URL("./config.json", import.meta.url), "utf8"));
const root = cfg.outputRoot;
const output = path.join(root, "output");
fs.mkdirSync(output, { recursive: true });

const d = Number(cfg.durationSeconds) || 30;
const fps = Number(cfg.fps) || 30;
const w = Number(cfg.width) || 1920;
const h = Number(cfg.height) || 1080;
const out = path.join(output, "rainy-high-rise-auto-v1.mp4");

function run(args) {
  const r = spawnSync("ffmpeg", args, { stdio: "inherit", shell: false });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`ffmpeg exited with code ${r.status}`);
}

function renderStock(sourceFile, provider = "stock") {
  console.log("[AMBIENCE] VISUAL SOURCE:", String(provider).toUpperCase(), "VIDEO");
  run([
    "-y",
    "-stream_loop","-1","-i",sourceFile,
    "-f","lavfi","-i","anoisesrc=color=pink:amplitude=0.10:sample_rate=48000",
    "-t",String(d),
    "-filter_complex",
    `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},fps=${fps},eq=brightness=-0.035:saturation=0.88,vignette=PI/6,format=yuv420p[v]`,
    "-map","[v]","-map","1:a",
    "-af","highpass=f=90,lowpass=f=7000,volume=0.55,afade=t=in:st=0:d=1.5,afade=t=out:st="+Math.max(0,d-1.5)+":d=1.5",
    "-c:v","libx264","-preset","medium","-crf","20",
    "-c:a","aac","-b:a","192k",
    "-movflags","+faststart",
    "-shortest",out
  ]);
}

function renderGeneratedImage(sourceFile, provider = "ai") {
  console.log("[AMBIENCE] VISUAL SOURCE:", String(provider).toUpperCase(), "IMAGE");
  run([
    "-y",
    "-loop","1","-i",sourceFile,
    "-f","lavfi","-i","anoisesrc=color=pink:amplitude=0.10:sample_rate=48000",
    "-t",String(d),
    "-filter_complex",
    `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},zoompan=z='min(zoom+0.00015,1.035)':d=${Math.ceil(d*fps)}:s=${w}x${h}:fps=${fps},eq=brightness=-0.025:saturation=0.9,vignette=PI/6,format=yuv420p[v]`,
    "-map","[v]","-map","1:a",
    "-af","highpass=f=90,lowpass=f=7000,volume=0.55",
    "-c:v","libx264","-preset","medium","-crf","20",
    "-c:a","aac","-b:a","192k",
    "-movflags","+faststart",
    "-shortest",out
  ]);
}

function renderProcedural() {
  console.log("[AMBIENCE] VISUAL SOURCE: PROCEDURAL FALLBACK");
  const city = [
    `color=c=0x07101f:s=${w}x${h}:r=${fps}:d=${d}`,
    `drawbox=x=0:y=h*0.62:w=iw:h=ih*0.38:color=0x03060c:t=fill`,
    `drawgrid=w=96:h=70:t=2:c=0x243247@0.28`,
    `vignette=PI/5`,
    `noise=alls=3:allf=t+u`
  ].join(",");
  const rain = [
    `nullsrc=s=${w}x${h}:r=${fps}:d=${d}`,
    `geq=random(1)/hypot(X-cos(N*0.04)*W/2,Y-H/2)*9000:128:128`,
    `boxblur=1:6`,
    `colorchannelmixer=aa=0.16`
  ].join(",");
  const filter = [
    `[0:v]${city}[base]`,
    `[1:v]${rain}[rain]`,
    `[base][rain]blend=all_mode=screen:all_opacity=0.32,format=yuv420p[v]`
  ].join(";");
  run([
    "-y",
    "-f","lavfi","-i",`color=black:s=${w}x${h}:r=${fps}:d=${d}`,
    "-f","lavfi","-i",`color=black:s=${w}x${h}:r=${fps}:d=${d}`,
    "-f","lavfi","-i","anoisesrc=color=pink:amplitude=0.10:sample_rate=48000",
    "-filter_complex",filter,
    "-map","[v]","-map","2:a",
    "-t",String(d),
    "-af","highpass=f=90,lowpass=f=7000,volume=0.55",
    "-c:v","libx264","-preset","medium","-crf","20",
    "-c:a","aac","-b:a","192k",
    "-movflags","+faststart",
    "-shortest",out
  ]);
}

console.log("[AMBIENCE] AUTO V1 START");
console.log("[AMBIENCE] THEME:", cfg.theme);

let visual = null;
try {
  visual = await acquireVisual(cfg, root);
} catch (e) {
  console.warn("[AMBIENCE] SOURCE FAILED:", e.message);
}

try {
  if (visual?.file && fs.existsSync(visual.file)) {
    if (visual.type === "video") renderStock(visual.file, visual.provider);
    else renderGeneratedImage(visual.file, visual.provider);
  } else renderProcedural();
} catch (e) {
  if (visual?.file) {
    console.warn("[AMBIENCE] STOCK RENDER FAILED; FALLBACK:", e.message);
    renderProcedural();
  } else {
    throw e;
  }
}

if (!fs.existsSync(out) || fs.statSync(out).size < 100000) {
  throw new Error("Ambience output missing or too small");
}
console.log("[AMBIENCE] COMPLETE");
console.log(out);
