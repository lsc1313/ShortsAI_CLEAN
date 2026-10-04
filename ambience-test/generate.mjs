import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const cfg = JSON.parse(fs.readFileSync(new URL("./config.json", import.meta.url), "utf8"));
const root = cfg.outputRoot;
const input = path.join(root, "input");
const output = path.join(root, "output");
fs.mkdirSync(input, { recursive: true });
fs.mkdirSync(output, { recursive: true });

const bg = path.join(input, "background.jpg");
const rain = path.join(input, "rain.wav");
const out = path.join(output, "rainy-high-rise-loop.mp4");

if (!fs.existsSync(bg)) {
  console.log("[AMBIENCE] Background image required:");
  console.log(bg);
  process.exit(2);
}

const d = Number(cfg.durationSeconds) || 30;
const fps = Number(cfg.fps) || 30;
const w = Number(cfg.width) || 1920;
const h = Number(cfg.height) || 1080;

// Very small ping-pong zoom: start/end framing match, so repeating the
// finished clip does not create a camera-position jump.
const zoom = `1+0.008*(1-cos(2*PI*on/(${d}*${fps})))/2`;
const vf = [
  `scale=${w + 80}:${h + 80}:force_original_aspect_ratio=increase`,
  `crop=${w + 40}:${h + 40}`,
  `zoompan=z='${zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}:fps=${fps}`,
  "format=yuv420p"
].join(",");

const args = ["-y", "-loop", "1", "-framerate", String(fps), "-i", bg];

if (fs.existsSync(rain)) {
  args.push("-stream_loop", "-1", "-i", rain);
} else {
  // No copyrighted audio dependency. Brown/pink-ish filtered noise is only
  // a V1 timing/loop placeholder; replace with recorded/licensed rain later.
  args.push("-f", "lavfi", "-i", "anoisesrc=color=pink:amplitude=0.10:sample_rate=48000");
}

args.push(
  "-t", String(d),
  "-vf", vf,
  "-af", "highpass=f=120,lowpass=f=8500,volume=0.75,afade=t=in:st=0:d=0.15,afade=t=out:st=" + Math.max(0,d-0.15) + ":d=0.15",
  "-c:v", "libx264", "-preset", "medium", "-crf", "20",
  "-c:a", "aac", "-b:a", "192k",
  "-movflags", "+faststart",
  "-shortest", out
);

console.log("[AMBIENCE] V1 START");
const result = spawnSync("ffmpeg", args, { stdio: "inherit", shell: false });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log("[AMBIENCE] COMPLETE");
console.log(out);
