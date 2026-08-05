import { runChannel } from "../common.js";

export async function generateTopics(request) {

    const result = await runChannel({
        ...request,
        name: "AI",
        category: "ai"
    });

    return result.slice(0, request.count);
}

export default {
    generateTopics
};
