export async function getNewsTrends(channel){

    const topics = [];

    // TODO:
    // News API 연동

    return topics.map(topic => ({
        title: topic.title,
        score: topic.score ?? 15,
        source: "news",
        category: channel
    }));

}
