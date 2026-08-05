export async function getYoutubeTrends(channel){

    const topics = [];

    // TODO:
    // YouTube Data API 연동

    return topics.map(topic => ({
        title: topic.title,
        score: topic.score ?? 20,
        source: "youtube",
        category: channel
    }));

}
