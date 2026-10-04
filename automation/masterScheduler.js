import * as Brain from "../brain/brain.js";
import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const Hotdeal = require("../coupang-hotdeal/index.js");
import path from "path";

import {
    selectShoppingRecommendation
} from "./shoppingRecommendation.js";

import {
    rememberRecommendedProduct
} from "./shoppingRecommendationDB.js";

import {
    createPartnerLink
} from "../modules/coupang/index_api.js";

import {
    getCompletedJobs,
    rememberCompletedJob,
    removeCompletedJob,
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

HOTDEAL / Shopping Recommendation은
다음 단계에서 이 파일에 추가한다.
=========================================================
*/

const CHECK_INTERVAL_MS = 30 * 1000;

const DAILY_JOBS = [
    {
        id: "hotdeal-morning",
        hour: 8,
        minute: 0,
        channel: "hotdeal",
        count: 1
    },
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
        id: "hotdeal-evening",
        hour: 21,
        minute: 0,
        channel: "hotdeal",
        count: 1
    }
];

const completedJobs =
    getCompletedJobs();

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


function isDue(
    job,
    now = new Date()
) {

    const scheduled =
        new Date(now);

    scheduled.setHours(
        job.hour,
        job.minute,
        0,
        0
    );

    /*
    예약시간이 이미 지났더라도
    오늘 아직 실행하지 않은 작업이면 실행한다.
    */
    return (
        now.getTime() >=
        scheduled.getTime()
    );
}


async function runHotdealJob() {

    console.log("");
    console.log(
        "========================================="
    );
    console.log(
        " HOTDEAL SCHEDULE JOB"
    );
    console.log(
        "========================================="
    );

    const activeProducts =
        Hotdeal.getActiveProducts();

    if (
        !Array.isArray(activeProducts) ||
        activeProducts.length === 0
    ) {
        throw new Error(
            "HOTDEAL: 활성 상품이 없습니다."
        );
    }

    const productGroups =
        activeProducts.map(
            product => product.name
        );

    console.log(
        `[HOTDEAL] 활성 상품군 : ${productGroups.length}`
    );

    /*
    1. 활성 상품군 전체 갱신
    */
    const products =
        await Hotdeal.run(
            productGroups
        );

    if (
        !Array.isArray(products) ||
        products.length === 0
    ) {
        throw new Error(
            "HOTDEAL: 갱신된 상품이 없습니다."
        );
    }

    const activeNames =
        new Set(
            activeProducts.map(
                product => product.name
            )
        );

    const hotdealProducts =
        products.filter(
            product =>
                activeNames.has(
                    product.productGroup
                )
        );

    if (
        hotdealProducts.length === 0
    ) {
        throw new Error(
            "HOTDEAL: 갱신된 활성 상품이 없습니다."
        );
    }

    console.log(
        `[HOTDEAL] 갱신 완료 : ${hotdealProducts.length}/${activeProducts.length}`
    );

    /*
    2. 전체 갱신 상품을 하나의 HOTDEAL 작업으로
       기존 Brain 생산라인에 전달
    */
    const result =
        await Brain.start({

            mode:
                "QUICK",

            topic:
                "오늘의 생필품 HOTDEAL",

            count:
                1,

            channel:
                "Shopping",

            type:
                "HOTDEAL",

            products:
                hotdealProducts

        });

    console.log(
        "[HOTDEAL] COMPLETE"
    );

    return result;
}


async function runShoppingRecommendationJob() {

    console.log("");
    console.log(
        "========================================="
    );
    console.log(
        " 12:00 SHOPPING RECOMMENDATION"
    );
    console.log(
        "========================================="
    );

    /*
    1. 추천 상품 선정

    이 단계에서는 아직 DB에 기록하지 않는다.
    */
    const selected =
        await selectShoppingRecommendation();

    /*
    2. 파트너스 링크 생성
    */
    const partnerUrl =
        await createPartnerLink(
            selected.url
        );

    if (!partnerUrl) {
        throw new Error(
            "Shopping Recommendation: 파트너스 링크 생성 실패"
        );
    }

    /*
    3. 기존 Shopping IMAGE 엔진이 사용할
       상품 이미지를 로컬에 저장한다.
    */
    const imageId =
        `scheduled_${Date.now()}`;

    const imageDir =
        path.join(
            process.cwd(),
            "media",
            "products",
            imageId
        );

    fs.mkdirSync(
        imageDir,
        {
            recursive: true
        }
    );

    const imageFile =
        path.join(
            imageDir,
            "product.jpg"
        );

    await downloadImage(
        selected.image,
        imageFile
    );

    if (
        !fs.existsSync(imageFile) ||
        fs.statSync(imageFile).size === 0
    ) {
        throw new Error(
            "Shopping Recommendation: 상품 이미지 저장 실패"
        );
    }

    /*
    4. 기존 Shopping QUICK 생산라인이 사용하는
       Product 객체 형식으로 변환한다.
    */
    const product = {

        id:
            imageId,

        name:
            selected.name,

        keyword:
            selected.searchTopic,

        description:
            "",

        price:
            selected.price,

        partnerUrl,

        images: [
            imageFile
        ],

        enabled:
            true

    };

    console.log(
        "[SHOPPING RECOMMENDATION PRODUCT]",
        {
            productId:
                selected.productId,

            searchTopic:
                selected.searchTopic,

            name:
                product.name,

            price:
                product.price,

            image:
                product.images[0]
        }
    );

    /*
    5. 기존 Brain → Planner → Manager →
       createShort 생산라인 실행.

    반드시 await 한다.

    실제 생산/업로드가 실패하면 아래 DB 기록까지
    진행되지 않는다.
    */
    const result =
        await Brain.start({

            mode:
                "QUICK",

            topic:
                product.name,

            count:
                1,

            channel:
                "Shopping",

            product

        });

    /*
    6. 생산라인이 정상 완료된 뒤에만
       추천상품 중복 DB에 기록한다.
    */
    rememberRecommendedProduct({

        productId:
            selected.productId,

        productName:
            selected.name,

        searchTopic:
            selected.searchTopic

    });

    console.log(
        `[SHOPPING RECOMMENDATION] 중복 DB 기록 완료 : ${selected.productId}`
    );

    console.log(
        "[SHOPPING RECOMMENDATION] COMPLETE"
    );

    return result;
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

        /*
        실행 시작 전에 먼저 등록한다.

        30초 주기 tick이 같은 작업을
        다시 실행하는 것을 방지한다.
        */
completedJobs.add(key);

schedulerBusy = true;
currentJobId = job.id;
lastError = null;

try {

            if (
                job.id === "shopping-recommendation"
            ) {

                await runShoppingRecommendationJob();

            }
            else if (
                job.id === "hotdeal-morning" ||
                job.id === "hotdeal-evening"
            ) {

                await runHotdealJob();

            }
            else {

                await runChannelJob(
                    job
                );

            }

const brainStatus =
    Brain.getStatus();

jobResults.set(
    key,
    {
        completed:
            Number(brainStatus?.current || 0),

        target:
            Number(job.count || 0)
    }
);

rememberCompletedJob(key);

        }
        catch (error) {

completedJobs.delete(key);
removeCompletedJob(key);

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

const result =
    jobResults.get(key) || null;

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
    result?.completed ?? null,

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


