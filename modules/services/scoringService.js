export async function calculate(candidate, channel) {

    let score = 0;

    score += trendScore(candidate);

    score += channelScore(candidate, channel);

    score += keywordScore(candidate);

    return {
        ...candidate,
        score
    };

}

function trendScore(candidate) {

    let score = 0;

    if (candidate.trend)
        score += 30;

    if (candidate.hot)
        score += 20;

    return score;

}

function channelScore(candidate, channel) {

    let score = 0;

    if (candidate.category === channel.category)
        score += 20;

    return score;

}

function keywordScore(candidate) {

    let score = 0;

    const keywords = candidate.keywords || [];

    score += Math.min(
        keywords.length * 2,
        20
    );

    return score;

}

export function sortCandidates(list) {

    return list.sort(
        (a, b) => b.score - a.score
    );

}

export function bestCandidate(list) {

    if (!list.length)
        return null;

    return sortCandidates(list)[0];

}

export async function scoreTopics(topics, channel) {

    const scored = [];

    for (const topic of topics) {

        scored.push(
            await calculate(
                topic,
                channel
            )
        );

    }

    return sortCandidates(scored);

}

export default {
    calculate,
    scoreTopics,
    sortCandidates,
    bestCandidate
};
