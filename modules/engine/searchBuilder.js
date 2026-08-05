export function buildSearch(plan) {

    const words = [];

    const add = (value) => {

        value = String(value || "").trim();

        if (!value) return;

        if (
            value === "undefined" ||
            value === "null" ||
            value === "NaN"
        ) return;

        words.push(value);

    };

    add(plan.subject);
    add(plan.focus);
    add(plan.action);

    const blacklist = [

        "realistic",
        "photo",
        "photography",
        "detail",
        "close up",
        "macro",
        "fresh",
        "cooking",
        "portrait"

    ];

    const result = [];

    for (const word of words) {

        const lower = word.toLowerCase();

        if (blacklist.includes(lower))
            continue;

        if (!result.some(v => v.toLowerCase() === lower)) {

            result.push(word);

        }

    }

    return result.join(" ");

}
