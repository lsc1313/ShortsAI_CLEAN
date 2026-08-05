import Manager from "./manager.js";
import Channels from "../modules/channels/index.js";
import { classify } from "../modules/services/categoryService.js";

export class Planner {

    constructor(logger = console, reporter = null) {

        this.logger = logger;

        this.manager =
            new Manager(logger);

        this.pool = [];

        this.job = null;

        this.reporter = reporter;

    }


    async execute(job) {

        this.logger.log(
            "[Planner] Execute"
        );

        this.job = job;

        switch (job.mode) {

            case "QUICK":
                return await this.planQuick(job);

            case "AUTO":
                return await this.planAuto(job);

            default:
                throw new Error(
                    `Unknown mode : ${job.mode}`
                );

        }

    }


    /*
        빠른생성

        사용자가 입력한 주제를 그대로 사용한다.
        Planner는 적합한 채널만 결정한다.
    */

    async planQuick(job) {

        /*
            QUICK 채널 결정

            일반 빠른생성:
                기존 classify() 결과 사용

            쿠팡 상품생성:
                서버에서 job.channel = "Shopping"
                으로 지정하면 Shopping 채널 사용
        */

        const classified =
            classify(job.topic);

        const channel =
            job.channel ||
            classified;

        const category =
            channel === "Shopping"
                ? "쇼핑"
                : classified;

        this.logger.log(
            `[Planner] QUICK Channel : ${channel}`
        );

        this.pool = [
            {
                topic:
                    job.topic,

                category,

                channel,

                score:
                    100,

                product:
                    job.product || null
            }
        ];

        return await this.manager.execute(
            this,
            this.reporter
        );

    }


    /*
        자동생성

        사용자가 선택한 카테고리와
        요청수량을 채널에 그대로 전달한다.
    */

    async planAuto(job) {

        const orders =
            await Channels.execute(
                job.categories,
                job
            );

        this.pool = orders.sort(
            (a, b) =>
                b.score - a.score
        );

        return await this.manager.execute(
            this,
            this.reporter
        );

    }


    /*
        Manager가 필요한 수량만 요청
    */

    nextOrders(
        count,
        excludeChannels = []
    ) {

        const orders = [];

        while (
            this.pool.length > 0 &&
            orders.length < count
        ) {

            const order =
                this.pool.shift();

            if (
                excludeChannels.includes(
                    order.channel
                )
            ) {
                continue;
            }

            orders.push(order);

        }

        return orders;

    }


    reset() {

        this.pool = [];

    }

}


export async function execute(job, reporter = null) {

    const planner =
        new Planner(
            console,
            reporter
        );

    return await planner.execute(job);

}


export default Planner;
