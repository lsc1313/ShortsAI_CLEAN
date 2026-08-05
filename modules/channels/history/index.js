import { runChannel } from "../common.js";

export async function generateTopics(request) {

    const result = await runChannel({
        ...request,
        name: "History",
        category: "history"
    });

    return result.slice(0, request.count);
}

export default {
    generateTopics
};
