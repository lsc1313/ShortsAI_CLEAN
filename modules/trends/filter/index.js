import { CHANNEL_KEYWORDS } from "./keywords.js";

export function filterChannel(channel, topics = []) {

    const keywords = CHANNEL_KEYWORDS[channel] || [];

    if (keywords.length === 0) {

        return topics;

    }

    return topics.filter(topic =>

        keywords.some(keyword =>

            topic.title
                .toLowerCase()
                .includes(keyword.toLowerCase())

        )

    );

}
