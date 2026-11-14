/**
 * History Shorts KO + EN publishing state.
 * One Director, one image search, two renders, two independent uploads.
 *
 * Files are stored outside the standard media cleanup directories so that
 * a failed English upload can be resumed WITHOUT creating another KO upload.
 * A production is identified by the original requested topic.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { uploadVideo } from "../upload.js";

const STORE_ROOT = path.resolve("media", "history-dual-publish");

export function historyPairDirectory(topic) {
    const normalized = String(topic || "").normalize("NFKC").trim();
    if (!normalized) throw new Error("HISTORY_PAIR_TOPIC_REQUIRED");
    const key = crypto.createHash("sha256").update(normalized).digest("hex");
    return path.join(STORE_ROOT, key);
}

function stateFile(topic) {
    return path.join(historyPairDirectory(topic), "state.json");
}

function writeState(file, state) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = file + ".tmp";
    fs.writeFileSync(temp, JSON.stringify(state, null, 2), "utf8");
    fs.renameSync(temp, file);
}

export function readHistoryPair(topic) {
    const file = stateFile(topic);
    if (!fs.existsSync(file)) return null;
    const data = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
    if (data.topic !== topic) throw new Error("HISTORY_PAIR_TOPIC_MISMATCH");
    return data;
}

/**
 * Recover an existing ready or partially uploaded pair BEFORE starting a new
 * History job. Prevents unfinished English uploads from being abandoned when
 * the scheduler selects a different topic on its next run.
 */
export function findUnfinishedHistoryPair() {
    if (!fs.existsSync(STORE_ROOT)) return null;
    const unfinished = [];
    for (const name of fs.readdirSync(STORE_ROOT)) {
        const file = path.join(STORE_ROOT, name, "state.json");
        if (!fs.existsSync(file)) continue;
        try {
            const data = JSON.parse(fs.readFileSync(file, "utf8"));
            if (data?.topic && (!data.ko?.id || !data.en?.id)) {
                unfinished.push(data);
            }
        } catch (error) {
            throw new Error("HISTORY_PAIR_CORRUPT_STATE: " + file + ": " + error.message);
        }
    }
    unfinished.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    return unfinished[0] || null;
}

export function saveHistoryKOVideo(topic, file) {
    if (!fs.existsSync(file)) throw new Error("HISTORY_KO_VIDEO_MISSING");
    const dir = historyPairDirectory(topic);
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, "ko.mp4");
    fs.copyFileSync(file, dest);
    if (fs.statSync(dest).size < 10000) throw new Error("HISTORY_KO_VIDEO_INVALID");
    return dest;
}

/**
 * Called only AFTER both language renders succeeded. No upload happens here.
 * Never overwrite successful channel IDs or media from a prior ready job.
 */
export function saveHistoryPair({ topic, englishVideo, koMetadata, enMetadata }) {
    const current = readHistoryPair(topic);
    if (current) return current;
    const dir = historyPairDirectory(topic);
    const koVideo = path.join(dir, "ko.mp4");
    const enVideo = path.join(dir, "en.mp4");
    if (!fs.existsSync(koVideo) || fs.statSync(koVideo).size < 10000) {
        throw new Error("HISTORY_KO_RENDER_NOT_SAVED");
    }
    if (!fs.existsSync(englishVideo)) throw new Error("HISTORY_EN_VIDEO_MISSING");
    fs.copyFileSync(englishVideo, enVideo);
    if (fs.statSync(enVideo).size < 10000) throw new Error("HISTORY_EN_VIDEO_INVALID");

    const state = {
        version: 1,
        topic,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ko: { file: koVideo, metadata: koMetadata, id: "", url: "" },
        en: { file: enVideo, metadata: enMetadata, id: "", url: "" }
    };
    writeState(stateFile(topic), state);
    return state;
}

export function buildEnglishHistoryDirector(director) {
    if (!Array.isArray(director?.scenes) || director.scenes.length === 0) {
        throw new Error("HISTORY_EN_NO_SCENES");
    }
    if (!String(director.titleEn || "").trim()) {
        throw new Error("HISTORY_EN_TITLE_MISSING");
    }
    return {
        ...director,
        title: director.titleEn.trim(),
        scenes: director.scenes.map((scene, index) => {
            const tts = String(scene.ttsEn || scene.scriptEn || "").trim();
            const subtitle = String(scene.subtitleEn || "").trim();
            if (!tts || !subtitle) {
                throw new Error(`HISTORY_EN_SCENE_${index + 1}_INCOMPLETE`);
            }
            return {
                ...scene,
                voice: tts,
                tts,
                script: String(scene.scriptEn || tts).trim(),
                subtitle
            };
        })
    };
}

export function buildEnglishHistoryMetadata(director) {
    const title = String(director.titleEn || "").trim();
    if (!title) throw new Error("HISTORY_EN_TITLE_MISSING");
    return {
        title: title.slice(0, 100),
        description: (String(director.descriptionEn || "").trim() ||
            `Explore the history behind ${title}. A short documentary about the people and events that shaped our world.`) +
            "\n\n#Shorts #History #HistoryDocumentary",
        tags: ["Shorts", "History", "History Documentary", "Historical Facts", "EchoesAgo"]
    };
}

function findEnglishChannel(config) {
    const list = Array.isArray(config) ? config : Object.values(config || {});
    return list.find(channel => String(channel?.name || "").toLowerCase() === "echoesago") || null;
}

function validateCredentials(channel, label) {
    if (!channel?.clientId || !channel?.clientSecret || !channel?.refreshToken) {
        throw new Error(`HISTORY_PAIR_${label}_OAUTH_MISSING`);
    }
}

/**
 * Resume-safe uploader. Saves each returned YouTube ID BEFORE attempting the
 * other channel. A subsequent retry NEVER uploads a recorded ID again.
 *
 * uploader is injectable for offline tests.
 */
export async function uploadHistoryPair(topic, koChannel, { uploader = uploadVideo, channelsFile = "./modules/channels/channels.json" } = {}) {
    const file = stateFile(topic);
    const state = readHistoryPair(topic);
    if (!state) throw new Error("HISTORY_PAIR_NOT_READY");

    const config = JSON.parse(fs.readFileSync(channelsFile, "utf8").replace(/^\uFEFF/, ""));
    const enChannel = findEnglishChannel(config);
    validateCredentials(koChannel, "KO");
    validateCredentials(enChannel, "EN");
    if (String(koChannel.name || "").toLowerCase() !== "history") {
        throw new Error("HISTORY_PAIR_KO_CHANNEL_MISMATCH");
    }
    // A misconfigured pair must never publish both languages to the same channel.
    if (koChannel.channelId && enChannel.channelId && koChannel.channelId === enChannel.channelId) {
        throw new Error("HISTORY_PAIR_IDENTICAL_CHANNEL_IDS");
    }

    for (const [lang, channel] of [["ko", koChannel], ["en", enChannel]]) {
        const record = state[lang];
        if (record.id) {
            console.log(`[HISTORY PAIR] ${lang.toUpperCase()} SKIP ${record.id}`);
            continue;
        }
        if (!fs.existsSync(record.file) || fs.statSync(record.file).size < 10000) {
            throw new Error(`HISTORY_PAIR_${lang.toUpperCase()}_FILE_MISSING`);
        }
        console.log(`[HISTORY PAIR] ${lang.toUpperCase()} UPLOAD -> ${channel.name}`);
        const result = await uploader(record.file, record.metadata, channel, topic, null);
        if (!result?.success || !result?.id) {
            throw new Error(`HISTORY_PAIR_${lang.toUpperCase()}_UPLOAD_FAILED`);
        }
        record.id = result.id;
        record.url = result.url || `https://youtu.be/${result.id}`;
        state.updatedAt = new Date().toISOString();
        writeState(file, state);
    }
    console.log(`[HISTORY PAIR] BOTH COMPLETE KO=${state.ko.id} EN=${state.en.id}`);
    return { ko: { ...state.ko }, en: { ...state.en } };
}

export function cleanupCompletedHistoryPair(topic) {
    const state = readHistoryPair(topic);
    if (!state?.ko?.id || !state?.en?.id) return false;
    for (const file of [state.ko.file, state.en.file]) {
        if (file && fs.existsSync(file)) fs.unlinkSync(file);
    }
    console.log("[HISTORY PAIR] LOCAL RENDERS CLEANED; UPLOAD IDS PRESERVED");
    return true;
}
