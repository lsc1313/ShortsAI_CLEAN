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
                    completed: []
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
                    : []
        };

    }
    catch (error) {

        console.error(
            "[SCHEDULER HISTORY LOAD ERROR]",
            error
        );

        return {
            completed: []
        };

    }

}

function saveData(data) {

    ensureStorage();

    fs.writeFileSync(
        HISTORY_FILE,
        JSON.stringify(
            data,
            null,
            2
        ),
        "utf8"
    );

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

    data.completed =
        data.completed.filter(
            key =>
                key.startsWith(
                    `${dateKey}:`
                )
        );

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