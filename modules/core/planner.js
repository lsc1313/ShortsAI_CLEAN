export default class Planner {

    constructor(manager, channels = []) {
        this.manager = manager;
        this.channels = channels;

        this.currentRanking = [];
        this.currentPlan = [];
    }

    // ==========================
    // 빠른 생성
    // ==========================
    async quickGenerate(task = {}) {

        const plan = {
            mode: "quick",
            createdAt: Date.now(),
            items: [task]
        };

        this.currentPlan = plan.items;

        if (this.manager?.receivePlan) {
            await this.manager.receivePlan(plan.items);
        }

        return plan.items;
    }

    // ==========================
    // 일괄 자동생성
    // ==========================
    async batchGenerate(request = {}) {

        const plans = await this.collectPlans(
            this.channels,
            request
        );

        this.sortPlans(plans);

        return await this.sendPlan();
    }

    // ==========================
    // 지정 자동생성
    // ==========================
    async customGenerate(request = {}) {

        const targets = this.channels.filter(channel =>
            request.departments?.includes(channel.name)
        );

        const plans = await this.collectPlans(
            targets,
            request
        );

        this.sortPlans(plans);

        return await this.sendPlan();
    }

    // ==========================
    // 생산부 기획안 수집
    // ==========================
    async collectPlans(channels, request) {

        const result = [];

        for (const channel of channels) {

            if (!channel.generatePlans) continue;

            try {

                const plans = await channel.generatePlans(request);

                if (Array.isArray(plans)) {
                    result.push(...plans);
                }

            } catch (err) {

                console.error(
                    `[Planner] ${channel.name} 실패`,
                    err.message
                );

            }

        }

        return result;
    }

    // ==========================
    // 점수순 정렬
    // ==========================
    sortPlans(plans = []) {

        this.currentRanking = [...plans].sort(
            (a, b) => b.score - a.score
        );

        return this.currentRanking;
    }

    // ==========================
    // Manager 전달
    // ==========================
    async sendPlan(count = 10) {

        this.currentPlan =
            this.currentRanking.slice(0, count);

        if (this.manager?.receivePlan) {

            await this.manager.receivePlan(
                this.currentPlan
            );

        }

        return this.currentPlan;
    }

    // ==========================
    // Manager 대체 요청
    // ==========================
    async getReplacementPlans({

        excludeChannels = [],
        count = 1

    } = {}) {

        const list = this.currentRanking.filter(item => {

            return !excludeChannels.includes(
                item.channel
            );

        });

        return list.slice(0, count);

    }

}
