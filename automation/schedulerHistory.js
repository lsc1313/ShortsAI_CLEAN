import fs from "fs";
import path from "path";

const DATA_DIR =
    path.resolve("data", "scheduler");

const HISTORY_FILE =
    path.join(
        DATA_DIR,
        "history.json"
    );

function ensureStorage() {

    if (!fs.existsSync(DATA_DIR)) {

        fs.mkdirSync(
            DATA_DIR,
            {
                recursive: true
            }
        );

    }

    if (!fs.existsSync(HISTORY_FILE)) {

        fs.writeFileSync(
            HISTORY_FILE,
            JSON.stringify(
                {
                    completed: [],
                    attempts: {}
                },
                null,
                2
            ),
            "utf8"
        );

    }

}

function loadData() {

    ensureStorage();

    try {

        const raw =
            fs.readFileSync(
                HISTORY_FILE,
                "utf8"
            );

        const data =
            JSON.parse(raw);

        return {
            completed:
                Array.isArray(data?.completed)
                    ? data.completed
                    : [],
            attempts: data?.attempts && typeof data.attempts === "object" ? data.attempts : {}
        };

    }
    catch (error) {

        console.error(
            "[SCHEDULER HISTORY LOAD ERROR]",
            error
        );

        return {
            completed: [],
            attempts: {}
        };

    }

}

function saveData(data) {

    ensureStorage();

    const temp = HISTORY_FILE + ".tmp";
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(temp, HISTORY_FILE);

}


// A claim is written synchronously before any external generation/upload.
// Pending claims survive process crashes and must never be auto-retried;
// a human can explicitly reset a failed/missed job when safe.
export function getSchedulerAttempts() {
    return { ...loadData().attempts };
}
export function claimSchedulerJob(key) {
    const data = loadData();
    if (data.attempts[key] || data.completed.includes(key)) return false;
    data.attempts[key] = { status: "running", startedAt: new Date().toISOString() };
    saveData(data);
    return true;
}
export function finishSchedulerJob(key, outcome) {
    const data = loadData();
    const startedAt = data.attempts[key]?.startedAt || new Date().toISOString();
    data.attempts[key] = {
        status: outcome.status,
        completed: Number(outcome.completed || 0),
        target: Number(outcome.target || 1),
        reason: String(outcome.reason || "").slice(0, 1000),
        startedAt,
        finishedAt: new Date().toISOString()
    };
    if (!data.completed.includes(key)) data.completed.push(key);
    saveData(data);
}

export function getCompletedJobs() {

    return new Set(
        loadData().completed
    );

}

export function rememberCompletedJob(
    key
) {

    const data =
        loadData();

    if (
        !data.completed.includes(key)
    ) {

        data.completed.push(
            key
        );

        saveData(
            data
        );

    }

}

export function removeCompletedJob(
    key
) {

    const data =
        loadData();

    data.completed =
        data.completed.filter(
            item =>
                item !== key
        );

    saveData(
        data
    );

}

export function cleanupCompletedJobs(
    dateKey
) {

    const data =
        loadData();

    data.completed = data.completed.filter(key => key.startsWith(`${dateKey}:`));
    data.attempts = Object.fromEntries(Object.entries(data.attempts).filter(([key]) => key.startsWith(`${dateKey}:`)));

    saveData(
        data
    );

}

export default {
    getCompletedJobs,
    rememberCompletedJob,
    removeCompletedJob,
    cleanupCompletedJobs
};