export function normalizeTopics(topics = []) {

    const map = new Map();

    for (const item of topics) {

        if (!item?.title) continue;

        const title = item.title.trim();

        if (!map.has(title)) {

            map.set(title, {
                title,
                score: item.score ?? 0,
                source: item.source ?? []
            });

            continue;
        }

        const old = map.get(title);

        old.score += item.score ?? 0;

        if (item.source) {

            if (Array.isArray(item.source)) {

                old.source.push(...item.source);

            } else {

                old.source.push(item.source);

            }

        }

    }

    return [...map.values()]
        .sort((a, b) => b.score - a.score);

}
