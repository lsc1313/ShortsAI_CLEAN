import * as Brain from "../brain/brain.js";
import fs from "fs";
import { chooseCuratorProduct, markCuratorPublished, listCuratorProducts } from "../modules/kakaoCurator/store.js";
import { enrichCuratorProduct, prepareCuratorProduct } from "../modules/kakaoCurator/media.js";
import path from "path";
import { isScheduledNow } from "./schedulerTiming.js";

import {
    selectShoppingRecommendationCandidates
} from "./shoppingRecommendation.js";

import {
    rememberRecommendedProduct
} from "./shoppingRecommendationDB.js";

import {
    createPartnerLink
} from "../modules/coupang/index_api.js";
import { resolveCoupangProduct } from "../modules/coupang/productResolver.js";
import { prepareShoppingProduct } from "../modules/shopping/productMedia.js";

import {
    getCompletedJobs,
    getSchedulerAttempts,
    claimSchedulerJob,
    finishSchedulerJob,
    cleanupCompletedJobs
} from "./schedulerHistory.js";

import {
    downloadImage
} from "../modules/image/download.js";



/*
=========================================================
ShortsAI PC MASTER SCHEDULER

09:00  AI       1개
10:00  Science  1개
13:00  History  1개

Shopping: Coupang Partners 12:00 x1; Kakao Curator 18:00 x1.
=========================================================
*/

const CHECK_INTERVAL_MS = 30 * 1000;

const DAILY_JOBS = [
    {
        id: "ai",
        hour: 9,
        minute: 0,
        channel: "ai",
        count: 1
    },
    {
        id: "science",
        hour: 10,
        minute: 0,
        channel: "science",
        count: 1
    },
    {
        id: "shopping-recommendation",
        hour: 12,
        minute: 0,
        channel: "shopping-recommendation",
        count: 1
    },
    {
        id: "history",
        hour: 13,
        minute: 0,
        channel: "history",
        count: 1
    },
    {
        id: "kakao-curator",
        hour: 18,
        minute: 0,
        channel: "kakao-curator",
        count: 1
    }
];

const completedJobs = getCompletedJobs();
const jobAttempts = new Map(Object.entries(getSchedulerAttempts()));

let schedulerBusy = false;

let currentJobId = null;
let lastError = null;

const jobResults = new Map();


function getDateKey(date = new Date()) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function getJobKey(
    job,
    date = new Date()
) {

    return (
        `${getDateKey(date)}:${job.id}`
    );
}


export function isDue(job, now = new Date()) {
    return isScheduledNow(job, now);
}

async function runKakaoCuratorJob() {
    // A supplied affiliate link can be enriched from publicly available
    // page metadata; authenticated pages may still require manual image entry.
    for (const item of listCuratorProducts().filter(p => p.enabled !== false && !p.images?.length)) {
        await enrichCuratorProduct(item);
    }
    const product = chooseCuratorProduct();
    if (!product) {
        // No attribution-safe product with usable media; never publish an
        // unrelated image or repeat the same gift recommendation every day.
        console.log("[KAKAO CURATOR] 유효한 미게시 상품이 없어 오늘 업로드를 건너뜁니다.");
        return { skipped: true, reason: "no-eligible-product" };
    }
    const prepared = await prepareCuratorProduct(product);
    const result = await Brain.start({
        mode: "QUICK",
        topic: prepared.name,
        count: 1,
        channel: "Shopping",
        product: prepared
    });
    // Brain.start can return an error status without throwing; do not mark
    // a product published unless at least one video finished successfully.
    const status = Brain.getStatus();
    if (status.status !== "완료" || Number(status.current || 0) < 1) {
        throw new Error("KAKAO CURATOR: 쇼츠 제작/업로드 성공을 확인하지 못했습니다.");
    }
    markCuratorPublished(product);
    return result;
}

async function runShoppingRecommendationJob() {
    // Do not mark a shopping product as published until YouTube production
    // truly completes. An HTML/API page with only one distinct photo should
    // not consume the daily slot or contaminate the recommendation history.
    const candidates = await selectShoppingRecommendationCandidates(5);
    const failures = [];

    for (const selected of candidates) {
        try {
            const partnerUrl = await createPartnerLink(selected.url);
            if (!partnerUrl || typeof partnerUrl !== "string") {
                throw new Error("쿠팡 파트너스 링크 생성 실패");
            }

            let exact = null;
            try {
                exact = await resolveCoupangProduct({
                    name: selected.name,
                    partnerUrl,
                    images: [selected.image]
                });
            } catch (error) {
                console.warn("[COUPANG] 상세정보 확인 실패:", error.message);
            }
            // Only identity-matched details and galleries can supplement the
            // verified catalog image. Never use another SKU's photos.
            const verified = exact?.resolved === true ? exact : null;
            const attrs = verified?.attributes || [];
            const description = attrs
                .filter(x => x?.type && x?.value)
                .map(x => `${x.type}: ${x.value}`)
                .join("; ");

            const product = {
                id: String(selected.productId),
                name: verified?.productTitle || selected.name,
                keyword: selected.searchTopic,
                description,
                price: Number(verified?.price) || selected.price,
                partnerUrl,
                sourceUrl: verified?.detailUrl || selected.url,
                provider: "coupang",
                images: [selected.image],
                galleryImages: verified?.galleryImages || [],
                publicImages: [selected.image],
                enabled: true
            };

            // This is intentionally before Brain.start. A failed product
            // cannot result in a misleading "완료 0/1" success.
            const prepared = await prepareShoppingProduct(product);
            console.log("[COUPANG MEDIA]", {
                productId: selected.productId,
                candidateUrls: [selected.image, ...product.galleryImages].length,
                distinctPhotos: prepared.images.length,
                mediaSource: prepared.mediaSource
            });

            const result = await Brain.start({
                mode: "QUICK",
                topic: prepared.name,
                count: 1,
                channel: "Shopping",
                product: prepared
            });
            const status = Brain.getStatus();
            if (status.status !== "완료" || Number(status.current || 0) < 1) {
                throw new Error("쇼츠 제작 또는 업로드 미완료 (완료 0/1)");
            }

            rememberRecommendedProduct({
                productId: selected.productId,
                productName: selected.name,
                searchTopic: selected.searchTopic
            });
            console.log("[SHOPPING] 쿠팡 쇼츠 업로드 성공:", selected.productId);
            return result;
        } catch (error) {
            const message = String(error?.message || error);
            failures.push(`${selected.productId}: ${message}`);
            console.warn("[SHOPPING] 후보 제외:", selected.productId, message);
            // If production/upload was attempted and failed, do not blindly
            // attempt further uploads in the same tick: they might have
            // partially succeeded and need inspection first.
            if (!/SHOPPING_MEDIA_INSUFFICIENT|상품 이미지|상품 사진|상세정보|파트너스 링크|미지원|COUPANG/i.test(message)) {
                throw error;
            }
        }
    }

    console.warn(
        "[SHOPPING] 오늘 후보 이미지 부족: " + failures.join(" | ").slice(0,1000)
    );
    return {
        skipped: true,
        reason: "insufficient-product-images",
        diagnostics: failures
    };
}

async function runChannelJob(job) {

    console.log("");
    console.log(
        "========================================="
    );
    console.log(
        " MASTER SCHEDULER JOB"
    );
    console.log(
        "========================================="
    );

    console.log(
        `[SCHEDULER] CHANNEL : ${job.channel}`
    );

    console.log(
        `[SCHEDULER] COUNT   : ${job.count}`
    );

    console.log(
        `[SCHEDULER] START   : ${new Date().toLocaleString()}`
    );

    const result =
        await Brain.start({
            mode: "AUTO",
            count: job.count,
            categories: [
                job.channel
            ]
        });

    console.log(
        `[SCHEDULER] COMPLETE : ${job.channel}`
    );

    return result;
}


async function tick() {

    if (schedulerBusy) {
        return;
    }

    const now =
        new Date();

    for (const job of DAILY_JOBS) {

        if (!isDue(job, now)) {
            continue;
        }

        const key =
            getJobKey(
                job,
                now
            );

        if (
            completedJobs.has(key)
        ) {
            continue;
        }

        // Durable claim BEFORE starting generation; even a crash/restart
        // cannot re-run this job on the same day.
        if (!claimSchedulerJob(key)) {
            completedJobs.add(key);
            continue;
        }
        completedJobs.add(key);
        jobAttempts.set(key, {status:"running",target:job.count,completed:0});

schedulerBusy = true;
currentJobId = job.id;
lastError = null;

try {
            let executionResult;

            if (job.id === "shopping-recommendation") {
                executionResult = await runShoppingRecommendationJob();
            } else if (job.id === "kakao-curator") {
                executionResult = await runKakaoCuratorJob();
            } else {
                executionResult = await runChannelJob(job);
            }

const brainStatus = Brain.getStatus();
            if (!executionResult?.skipped &&
                (brainStatus.status !== "완료" || Number(brainStatus.current || 0) < Number(job.count || 1))) {
                throw new Error("SCHEDULER_INCOMPLETE: " + job.id +
                    " 업로드 확인 실패 (" + (brainStatus.current || 0) + "/" + job.count + ")");
            }

const outcome = {
    status: executionResult?.skipped ? "skipped" : "completed",
    completed: executionResult?.skipped ? 0 : Number(brainStatus.current || 0),
    target: Number(job.count || 1),
    reason: executionResult?.reason || ""
};
jobResults.set(key, {...outcome, skipped: outcome.status === "skipped"});
jobAttempts.set(key, outcome);
finishSchedulerJob(key, outcome);

        }
        catch (error) {

// Retain a durable failed outcome; repeated retries may duplicate uploads.
const failure = {
    status:"failed",
    completed:0,
    target:Number(job.count || 1),
    reason:String(error?.message || error)
};
jobResults.set(key, failure);
jobAttempts.set(key, failure);
finishSchedulerJob(key, failure);

lastError = {
    jobId: job.id,
    message:
        error?.message ||
        String(error),
    at:
        new Date().toISOString()
};

            console.error("");
            console.error(
                `[SCHEDULER] FAILED : ${job.channel}`
            );

            console.error(
                error?.stack ||
                error?.message ||
                error
            );

        }
finally {

    schedulerBusy = false;
    currentJobId = null;

}

        /*
        동시에 여러 예약시간 작업을
        시작하지 않는다.
        */
        break;
    }


    /*
    오래된 실행기록 정리
    */

    const today =
        getDateKey(now);

    for (
        const key
        of completedJobs
    ) {

        if (
            !key.startsWith(
                `${today}:`
            )
        ) {
            completedJobs.delete(
                key
            );
        }

    }
cleanupCompletedJobs(today);
}

export function getMasterSchedulerStatus() {

    const now =
        new Date();

    const today =
        getDateKey(now);

    const jobs =
        DAILY_JOBS.map(job => {

            const key =
                `${today}:${job.id}`;

            const scheduled =
                new Date(now);

            scheduled.setHours(
                job.hour,
                job.minute,
                0,
                0
            );

let status =
    "waiting";

if (
    currentJobId === job.id
) {
    status =
        "running";
}
else if (
    completedJobs.has(key)
) {
    status =
        "completed";
}
            else if (
                now.getTime() >
                scheduled.getTime()
            ) {
                status =
                    "pending-recovery";
            }

const result = jobResults.get(key) || jobAttempts.get(key) || null;

if (result?.status === "skipped") status = "skipped";
else if (result?.status === "failed") status = "failed";
else if (result?.status === "running" && currentJobId !== job.id) status = "interrupted";
else if (result?.status === "completed") status = "completed";
else if (!result && !completedJobs.has(key) && now.getTime() >= scheduled.getTime() + 90000)
    status = "missed";

            return {
                id:
                    job.id,

                time:
                    `${String(job.hour).padStart(2, "0")}:${String(job.minute).padStart(2, "0")}`,

                channel:
                    job.channel,

                count:
                    job.count,

status,

completedCount:
    result?.completed ?? (completedJobs.has(key) ? job.count : null),

reason: result?.reason || null,

targetCount:
    result?.target ?? job.count
            };
        });

    return {
        running:
            schedulerBusy,

        currentJob:
            currentJobId,

        date:
            today,

        now:
            now.toISOString(),

        jobs,

        lastError
    };
}

export function startMasterScheduler() {

    console.log("");
    console.log(
        "========================================="
    );
    console.log(
        " SHORTSAI PC MASTER SCHEDULER"
    );
    console.log(
        "========================================="
    );

    for (
        const job
        of DAILY_JOBS
    ) {

        console.log(
            `${String(job.hour).padStart(2, "0")}:${String(job.minute).padStart(2, "0")}  ${job.channel} x${job.count}`
        );

    }

    console.log(
        "========================================="
    );

    /*
    실행 직후 한 번 확인
    */
    tick().catch(
        error => {
            console.error(
                "[SCHEDULER TICK ERROR]",
                error
            );
        }
    );

    return setInterval(
        () => {

            tick().catch(
                error => {
                    console.error(
                        "[SCHEDULER TICK ERROR]",
                        error
                    );
                }
            );

        },
        CHECK_INTERVAL_MS
    );
}


export default {
    startMasterScheduler
};


