import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const cfg = JSON.parse(fs.readFileSync(new URL("./config.json", import.meta.url), "utf8"));
const root = cfg.outputRoot;
const output = path.join(root, "output");
fs.mkdirSync(output, { recursive: true });

const d = Number(cfg.durationSeconds) || 30;
const fps = Number(cfg.fps) || 30;
const w = Number(cfg.width) || 1920;
const h = Number(cfg.height) || 1080;
const out = path.join(output, "rainy-high-rise-auto-v1.mp4");

// V1 is deliberately zero-input: FFmpeg procedurally creates the entire visual.
// Layer 1: dark rainy-night sky. Layer 2: distant city-window lights.
// Layer 3: animated rain streaks. Audio: filtered pink/brown noise rain bed.
// This validates unattended production before connecting a higher-quality
// visual-source engine.
const city = [
  `color=c=0x07101f:s=${w}x${h}:r=${fps}:d=${d}`,
  `drawbox=x=0:y=h*0.62:w=iw:h=ih*0.38:color=0x03060c:t=fill`,
  `drawgrid=w=96:h=70:t=2:c=0x243247@0.28`,
  `vignette=PI/5`,
  `noise=alls=3:allf=t+u`
].join(",");

// Rain is generated as temporal noise, stretched vertically and blended.
// It is intentionally subtle: ambience must not look like a visualizer.
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

const args = [
  "-y",
  "-f","lavfi","-i",`color=black:s=${w}x${h}:r=${fps}:d=${d}`,
  "-f","lavfi","-i",`color=black:s=${w}x${h}:r=${fps}:d=${d}`,
  "-f","lavfi","-i","anoisesrc=color=pink:amplitude=0.10:sample_rate=48000",
  "-filter_complex",filter,
  "-map","[v]","-map","2:a",
  "-t",String(d),
  "-af","highpass=f=90,lowpass=f=7000,volume=0.7",
  "-c:v","libx264","-preset","medium","-crf","20",
  "-c:a","aac","-b:a","192k",
  "-movflags","+faststart",
  "-shortest",out
];

console.log("[AMBIENCE] ZERO-INPUT V1 START");
console.log("[AMBIENCE] THEME:", cfg.theme);
const r = spawnSync("ffmpeg", args, { stdio: "inherit", shell: false });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log("[AMBIENCE] COMPLETE");
console.log(out);
