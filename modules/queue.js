import fs from "fs";
import path from "path";
import crypto from "crypto";

const QUEUE_ROOT = path.resolve("media/queue");
const QUEUE_FILE = path.join(QUEUE_ROOT, "queue.json");

function ensureQueue() {

    fs.mkdirSync(QUEUE_ROOT, {
        recursive: true
    });

    if (!fs.existsSync(QUEUE_FILE)) {

        fs.writeFileSync(
            QUEUE_FILE,
            JSON.stringify([], null, 2),
            "utf8"
        );

    }

}

function readQueue() {

    ensureQueue();

    try {

        const data = JSON.parse(
            fs.readFileSync(
                QUEUE_FILE,
                "utf8"
            )
        );

        return Array.isArray(data)
            ? data
            : [];

    }
    catch (error) {

        console.error(
            "[QUEUE] queue.json 읽기 실패:",
            error.message
        );

        return [];

    }

}

function writeQueue(queue) {

    ensureQueue();

    const tempFile =
        QUEUE_FILE + ".tmp";

    fs.writeFileSync(
        tempFile,
        JSON.stringify(queue, null, 2),
        "utf8"
    );

    fs.renameSync(
        tempFile,
        QUEUE_FILE
    );

}

function createJobId() {

    const time =
        Date.now();

    const random =
        crypto.randomBytes(4)
            .toString("hex");

    return `${time}_${random}`;

}

function safeCopy(source, target) {

    if (!source) {

        throw new Error(
            "복사할 원본 경로가 없습니다."
        );

    }

    const resolvedSource =
        path.resolve(source);

    if (!fs.existsSync(resolvedSource)) {

        throw new Error(
            `파일이 없습니다: ${resolvedSource}`
        );

    }

    fs.copyFileSync(
        resolvedSource,
        target
    );

}

export function enqueueShort({
    topic,
    channel = null,
    video,
    thumbnail,
    metadata = null
}) {

    ensureQueue();

    const jobId =
        createJobId();

    const jobDir =
        path.join(
            QUEUE_ROOT,
            jobId
        );

    fs.mkdirSync(
        jobDir,
        {
            recursive: true
        }
    );

    const videoTarget =
        path.join(
            jobDir,
            "shorts_final.mp4"
        );

    const thumbnailTarget =
        path.join(
            jobDir,
            "thumbnail.jpg"
        );

    try {

        safeCopy(
            video,
            videoTarget
        );

        safeCopy(
            thumbnail,
            thumbnailTarget
        );

        const now =
            new Date().toISOString();

        const job = {

            id: jobId,

            status: "pending",

            topic:
                topic || "",

            channel:
                channel || null,

            video:
                videoTarget,

            thumbnail:
                thumbnailTarget,

            metadata:
                metadata || null,

            attempts: 0,

            createdAt: now,

            updatedAt: now,

            startedAt: null,

            completedAt: null,

            failedAt: null,

            lastError: null

        };

        const queue =
            readQueue();

        queue.push(job);

        writeQueue(queue);

        console.log(
            `[QUEUE] 등록 완료: ${jobId}`
        );

        return job;

    }
    catch (error) {

        try {

            fs.rmSync(
                jobDir,
                {
                    recursive: true,
                    force: true
                }
            );

        }
        catch {}

        throw error;

    }

}

export function getQueue() {

    return readQueue();

}

export function getQueueJob(jobId) {

    const queue =
        readQueue();

    return (
        queue.find(
            job => job.id === jobId
        ) || null
    );

}

export function updateQueueJob(
    jobId,
    patch = {}
) {

    const queue =
        readQueue();

    const index =
        queue.findIndex(
            job => job.id === jobId
        );

    if (index === -1) {

        return null;

    }

    queue[index] = {

        ...queue[index],

        ...patch,

        id: queue[index].id,

        updatedAt:
            new Date().toISOString()

    };

    writeQueue(queue);

    return queue[index];

}

export function markQueueRunning(
    jobId
) {

    const job =
        getQueueJob(jobId);

    if (!job) {

        return null;

    }

    return updateQueueJob(
        jobId,
        {
            status: "running",

            attempts:
                Number(job.attempts || 0) + 1,

            startedAt:
                new Date().toISOString(),

            lastError: null
        }
    );

}

export function markQueueCompleted(
    jobId,
    result = null
) {

    return updateQueueJob(
        jobId,
        {
            status: "completed",

            completedAt:
                new Date().toISOString(),

            result,

            lastError: null
        }
    );

}

export function markQueueFailed(
    jobId,
    error
) {

    return updateQueueJob(
        jobId,
        {
            status: "failed",

            failedAt:
                new Date().toISOString(),

            lastError:
                error?.message ||
                String(error || "Unknown error")
        }
    );

}

export function getNextPendingJob() {

    const queue =
        readQueue();

    return (
        queue.find(
            job => job.status === "pending"
        ) || null
    );

}

export function retryQueueJob(
    jobId
) {

    return updateQueueJob(
        jobId,
        {
            status: "pending",

            startedAt: null,

            completedAt: null,

            failedAt: null,

            lastError: null
        }
    );

}

export function removeQueueJob(
    jobId,
    {
        removeFiles = true
    } = {}
) {

    const queue =
        readQueue();

    const job =
        queue.find(
            item => item.id === jobId
        );

    if (!job) {

        return false;

    }

    const nextQueue =
        queue.filter(
            item => item.id !== jobId
        );

    writeQueue(nextQueue);

    if (removeFiles) {

        const jobDir =
            path.join(
                QUEUE_ROOT,
                jobId
            );

        fs.rmSync(
            jobDir,
            {
                recursive: true,
                force: true
            }
        );

    }

    return true;

}

export function getQueueSummary() {

    const queue =
        readQueue();

    const summary = {

        total: queue.length,

        pending: 0,

        running: 0,

        completed: 0,

        failed: 0

    };

    for (const job of queue) {

        if (
            Object.prototype.hasOwnProperty.call(
                summary,
                job.status
            )
        ) {

            summary[job.status]++;

        }

    }

    return summary;

}
