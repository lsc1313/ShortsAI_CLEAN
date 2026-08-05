export class Registry {

    constructor() {
        this.channels = new Map();
    }

    register(channel) {

        if (!channel?.name) {
            throw new Error("Channel name is required.");
        }

        this.channels.set(channel.name, channel);

    }

    get(name) {
        return this.channels.get(name);
    }

    getAll() {
        return [...this.channels.values()];
    }

    size() {
        return this.channels.size;
    }

}
