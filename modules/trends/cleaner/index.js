const REMOVE_PATTERNS = [

    /\s*-\s*.*$/,

    /\[.*?\]/g,

    /\(.*?\)/g,

    /".*?"/g,

    /'.*?'/g,

    /\s+/g

];

export function cleanTitle(title = "") {

    let result = title;

    for (const pattern of REMOVE_PATTERNS) {

        if (pattern.source === "\\s+") {

            result = result.replace(pattern, " ");

        } else {

            result = result.replace(pattern, "");

        }

    }

    return result.trim();

}

export function cleanTopics(topics = []) {

    return topics.map(topic => ({

        ...topic,

        title: cleanTitle(topic.title)

    }));

}
