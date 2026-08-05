export class Scheduler {

    constructor(registry) {
        this.registry = registry;
    }

    async plan(totalVideos = 1) {

        const channels = this.registry.getAll();

        if (channels.length === 0) {
            return [];
        }

        const enabled = channels.filter(channel => channel.enabled !== false);

        if (enabled.length === 0) {
            return [];
        }

        const base = Math.floor(totalVideos / enabled.length);
        let remain = totalVideos % enabled.length;

        const plan = [];

        for (const channel of enabled) {

            let count = base;

            if (remain > 0) {
                count++;
                remain--;
            }

            if (count > 0) {
                plan.push({
                    channel: channel.name,
                    count
                });
            }

        }

        return plan;

    }

}
