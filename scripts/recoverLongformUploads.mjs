/**
 * Longform upload recovery: verify already-recorded YouTube uploads and
 * complete the production without ever uploading a video.
 *
 * Usage: node scripts/recoverLongformUploads.mjs <production-id>
 */
import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";
import { getProduction, completeProduction } from "../longform/productionState.js";

const id = Number(process.argv[2]);
if (!Number.isSafeInteger(id) || id < 1) {
  console.error("Usage: node scripts/recoverLongformUploads.mjs <production-id>");
  process.exit(2);
}

const record = getProduction(id);
if (!record) throw new Error(`Production ${id} not found`);
if (record.status === "completed") {
  console.log(`[RECOVERY] ${id} already completed; nothing to do`);
  process.exit(0);
}
if (!record.ko_video_id || !record.en_video_id) {
  throw new Error("Both recorded YouTube video IDs are required; no upload will be attempted");
}

const channelsPath = path.resolve("modules/channels/channels.json");
const config = JSON.parse(fs.readFileSync(channelsPath, "utf8").replace(/^\uFEFF/, ""));
const channels = Array.isArray(config) ? config : Object.values(config);
const targets = [
  { label: "KO", name: "History", videoId: record.ko_video_id },
  { label: "EN", name: "EchoesAgo", videoId: record.en_video_id }
];

async function verify(target) {
  const channel = channels.find(c => c?.name === target.name);
  if (!channel?.clientId || !channel?.clientSecret || !channel?.refreshToken) {
    throw new Error(`${target.name}: OAuth configuration missing`);
  }
  const oauth = new google.auth.OAuth2(channel.clientId, channel.clientSecret);
  oauth.setCredentials({ refresh_token: channel.refreshToken });
  const youtube = google.youtube({ version: "v3", auth: oauth });

  let result;
  try {
    result = await youtube.videos.list({
      part: ["status", "processingDetails"],
      id: [target.videoId]
    });
  } catch (error) {
    const message = String(error?.message || error);
    if (/insufficient authentication scopes|insufficientpermissions|insufficient permission/i.test(message)) {
      throw new Error(`${target.name}: OAUTH_SCOPE_REQUIRED. Reauthorize with youtube.readonly / youtube.force-ssl; no reupload needed`);
    }
    if (/invalid_grant/i.test(message)) {
      throw new Error(`${target.name}: OAUTH_RELOGIN_REQUIRED; no reupload needed`);
    }
    throw error;
  }

  const video = result.data.items?.[0];
  if (!video) throw new Error(`${target.name}: recorded video not visible to authenticated account`);
  const upload = video.status?.uploadStatus || "";
  const processing = video.processingDetails?.processingStatus || "";
  console.log(`[RECOVERY] ${target.label} ${target.videoId} upload=${upload} processing=${processing}`);
  if (upload === "rejected" || upload === "failed" || upload === "deleted" ||
      processing === "failed" || processing === "terminated") {
    throw new Error(`${target.name}: YouTube reports failed upload/processing`);
  }
  if (upload !== "processed" && processing !== "succeeded") {
    throw new Error(`${target.name}: processing not finished; retry recovery later`);
  }
}

for (const target of targets) await verify(target);

// Check the IDs again before writing; never complete a changed or unrelated job.
const current = getProduction(id);
if (current.ko_video_id !== record.ko_video_id || current.en_video_id !== record.en_video_id) {
  throw new Error("Production IDs changed during verification; refusing to complete");
}
completeProduction(id, {
  koVideoId: current.ko_video_id,
  enVideoId: current.en_video_id,
  koUrl: current.ko_url || `https://youtu.be/${current.ko_video_id}`,
  enUrl: current.en_url || `https://youtu.be/${current.en_video_id}`
});
console.log(`[RECOVERY] PRODUCTION ${id} COMPLETED (existing uploads only)`);
