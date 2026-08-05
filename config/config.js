import path from "path";

const ROOT = process.cwd();

export default {

    VERSION: "4.0",

    STORAGE: {

        CHANNELS: path.join(ROOT,
            "modules/brain_v4/storage/channels.json"),

        HISTORY: path.join(ROOT,
            "modules/brain_v4/storage/history.json"),

        ANALYTICS: path.join(ROOT,
            "modules/brain_v4/storage/analytics.json"),

        MEMORY: path.join(ROOT,
            "modules/brain_v4/storage/memory.json")
    },

    CHANNEL_STATUS: {

        NORMAL: "NORMAL",
        UPLOADING: "UPLOADING",
        LIMIT: "LIMIT",
        WAIT: "WAIT",
        DISABLED: "DISABLED"
    },

    TOPIC: {

        MAX_CANDIDATES: 100,

        HISTORY_DAYS: 30,

        SIMILARITY: 0.8
    },

    TREND: {

        ENABLE: true,

        CACHE_MINUTES: 30
    },

    SCORE: {

        TREND: 40,

        HISTORY: 20,

        CHANNEL: 20,

        ANALYTICS: 20
    }

};
