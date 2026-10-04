import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { DATA_ROOT } from "../config/paths.js";

function readJSON(file) {
    return JSON.parse(
        fs.readFileSync(file, "utf8")
            .replace(/^\uFEFF/, "")
    );
}

function ffmpegPath(file) {
    return path.resolve(file)
        .replace(/\\/g, "/")
        .replace(/^([A-Za-z]):/, "$1\\:");
}

function wrapText(text, maxChars, maxLines = 3) {

    text = String(text || "")
        .replace(/\s+/g, " ")
        .trim();

    if (!text) {
        return "";
    }

    const words = text.split(" ");
    const lines = [];
    let current = "";

    for (const word of words) {

        const candidate =
            current
                ? `${current} ${word}`
                : word;

        if (candidate.length <= maxChars) {
            current = candidate;
            continue;
        }

        if (current) {
            lines.push(current);
            current = word;
        }
        else {
            lines.push(
                word.slice(0, maxChars)
            );
            current =
                word.slice(maxChars);
        }

        if (lines.length >= maxLines) {
            break;
        }
    }

    if (
        current &&
        lines.length < maxLines
    ) {
        lines.push(current);
    }

    if (lines.length > maxLines) {
        lines.length = maxLines;
    }

    const joinedLength =
        lines.join(" ").length;

    if (joinedLength < text.length) {
        lines[lines.length - 1] =
            lines[lines.length - 1]
                .replace(/[.,!? ]+$/, "")
                .slice(0, Math.max(
                    1,
                    maxChars - 1
                )) +
            "…";
    }

    return lines.join("\n");
}

function findFont() {

    const candidates = [
        "C:/Windows/Fonts/malgunbd.ttf",
        "C:/Windows/Fonts/malgun.ttf",
        "C:/Windows/Fonts/arialbd.ttf"
    ];

    for (const file of candidates) {
        if (fs.existsSync(file)) {
            return file;
        }
    }

    throw new Error(
        "Thumbnail font not found"
    );
}

function createThumbnail({
    image,
    title,
    language,
    outputDir,
    font
}) {

    const output =
        path.join(
            outputDir,
            `thumbnail-${language}.jpg`
        );

    const textFile =
        path.join(
            outputDir,
            `thumbnail-${language}.txt`
        );

    const wrapped =
        wrapText(
            title,
            language === "ko"
                ? 17
                : 25,
            3
        );

    if (!wrapped) {
        throw new Error(
            `${language} thumbnail title missing`
        );
    }

    fs.writeFileSync(
        textFile,
        wrapped,
        "utf8"
    );

    const imageFilter =
        [
            "scale=1280:720:force_original_aspect_ratio=increase",
            "crop=1280:720",
            "eq=brightness=-0.05:saturation=0.90",
            "drawbox=x=0:y=0:w=iw:h=ih:color=black@0.20:t=fill",
            "drawbox=x=70:y=185:w=1140:h=350:color=black@0.30:t=fill",
            `drawtext=fontfile='${ffmpegPath(font)}'` +
            `:textfile='${ffmpegPath(textFile)}'` +
            ":fontcolor=white" +
            ":fontsize=68" +
            ":borderw=5" +
            ":bordercolor=black" +
            ":line_spacing=14" +
            ":x=(w-text_w)/2" +
            ":y=(h-text_h)/2"
        ].join(",");

    execFileSync(
        "ffmpeg",
        [
            "-y",
            "-i",
            image,
            "-vf",
            imageFilter,
            "-frames:v",
            "1",
            "-q:v",
            "2",
            output
        ],
        {
            stdio: "inherit"
        }
    );

    if (!fs.existsSync(output)) {
        throw new Error(
            `${language} thumbnail missing`
        );
    }

    return output;
}

const imageManifest =
    process.argv[2];

if (
    !imageManifest ||
    !fs.existsSync(imageManifest)
) {
    throw new Error(
        "Image manifest missing"
    );
}

const scriptFile =
    path.join(
        DATA_ROOT,
        "longform-script.json"
    );

if (!fs.existsSync(scriptFile)) {
    throw new Error(
        "Longform script missing"
    );
}

const script =
    readJSON(scriptFile);

const manifest =
    readJSON(imageManifest);

const images =
    Array.isArray(manifest.images)
        ? manifest.images
        : [];

const firstImage =
    images
        .map(x =>
            typeof x === "string"
                ? x
                : x?.file
        )
        .find(file =>
            file &&
            fs.existsSync(file)
        );

if (!firstImage) {
    throw new Error(
        "Thumbnail source image missing"
    );
}

const titleKo =
    script?.metadata?.thumbnailTextKo ||
    script?.thumbnailTextKo ||
    script?.metadata?.titleKo ||
    script?.titleKo ||
    script?.topic ||
    "역사의 숨겨진 이야기";

const titleEn =
    script?.metadata?.thumbnailTextEn ||
    script?.thumbnailTextEn ||
    script?.metadata?.titleEn ||
    script?.titleEn ||
    "The Hidden Story of History";

const outputDir =
    path.join(
        DATA_ROOT,
        "thumbnails"
    );

fs.mkdirSync(
    outputDir,
    {
        recursive: true
    }
);

const font =
    findFont();

const ko =
    createThumbnail({
        image: firstImage,
        title: titleKo,
        language: "ko",
        outputDir,
        font
    });

const en =
    createThumbnail({
        image: firstImage,
        title: titleEn,
        language: "en",
        outputDir,
        font
    });

console.log("");
console.log(
    "LONGFORM THUMBNAIL COMPLETE"
);
console.log(`KO_THUMBNAIL=${ko}`);
console.log(`EN_THUMBNAIL=${en}`);
