export async function getRedditTrends(channel){

    const topics = [];

    // TODO:
    // Reddit API 연동

    return topics.map(topic => ({
        title: topic.title,
        score: topic.score ?? 12,
        source: "reddit",
        category: channel
    }));

}
