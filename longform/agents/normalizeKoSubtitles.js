import fs from "node:fs";
import path from "node:path";
import { DATA_ROOT } from "../config/paths.js";

const file =
    path.join(
        DATA_ROOT,
        "subtitles-ko",
        "longform-ko.srt"
    );

if (!fs.existsSync(file)) {
    throw new Error(
        `KO subtitle missing: ${file}`
    );
}

function toMs(t) {
    const [h,m,s,ms] =
        t.split(/[:,]/).map(Number);

    return (
        h * 3600000 +
        m * 60000 +
        s * 1000 +
        ms
    );
}

function fromMs(value) {

    let ms = Math.max(
        0,
        Math.round(value)
    );

    const h =
        Math.floor(ms / 3600000);

    ms %= 3600000;

    const m =
        Math.floor(ms / 60000);

    ms %= 60000;

    const s =
        Math.floor(ms / 1000);

    ms %= 1000;

    return (
        String(h).padStart(2,"0") + ":" +
        String(m).padStart(2,"0") + ":" +
        String(s).padStart(2,"0") + "," +
        String(ms).padStart(3,"0")
    );
}

const lines =
    fs.readFileSync(file, "utf8")
        .split(/\r?\n/);

const timingIndexes = [];

const re =
    /^(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})$/;

for (
    let i = 0;
    i < lines.length;
    i++
) {

    if (re.test(lines[i].trim())) {
        timingIndexes.push(i);
    }
}

let fixed = 0;

for (
    let n = 1;
    n < timingIndexes.length;
    n++
) {

    const prevIndex =
        timingIndexes[n - 1];

    const currIndex =
        timingIndexes[n];

    const prev =
        lines[prevIndex]
            .trim()
            .match(re);

    const curr =
        lines[currIndex]
            .trim()
            .match(re);

    const prevStart =
        toMs(prev[1]);

    const prevEnd =
        toMs(prev[2]);

    const currStart =
        toMs(curr[1]);

    const overlap =
        prevEnd - currStart;

    if (overlap > 0) {

        if (overlap > 250) {
            throw new Error(
                `KO subtitle overlap too large: cue ${n} overlap=${overlap}ms`
            );
        }

        if (currStart <= prevStart) {
            throw new Error(
                `Invalid KO subtitle timing at cue ${n}`
            );
        }

        lines[prevIndex] =
            `${prev[1]} --> ${fromMs(currStart)}`;

        fixed++;
    }
}

fs.writeFileSync(
    file,
    lines.join("\n"),
    "utf8"
);

console.log(
    `KO SUBTITLE TIMING NORMALIZED FIXED=${fixed}`
);
console.log(file);
