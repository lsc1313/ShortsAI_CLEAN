import axios from "axios";
import { callAI } from "./ai/index.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { providers } from "./image/provider.js";
import { searchVideo } from "./image/videoSearch.js";
import { searchImage } from "./image/search.js";
import {
    selectBestMedia
} from "./ai/reviewerAI.js";
import { downloadVideo } from "./video/download.js";
import { downloadImage } from "./image/download.js";
import {
    ensureCache,
    cacheFile
} from "./image/cache.js";
import {
    cleanKeyword,
    normalizeKeyword,
    createSearchList
} from "./image/utils.js";
import { ensureDir } from "./image/directory.js";
import {
    debug,
    section,
    success
} from "./logger.js";

dotenv.config();

const IMAGE_DIR = "media/images";
const CACHE_DIR = "media/cache";

export async function createImage(director){

    ensureDir();

    ensureCache();

    const script =
        director.scenes;

const images = [];
    const usedUrls = new Set();

    let sceneNo = 1;

    for(const item of script){

const useProductImage =
    item.visualType === "product";

const keywords = [];

if (
    useProductImage &&
    item.product?.images?.length
){

const index =
    (sceneNo - 1) %
    item.product.images.length;

let file =
    String(
        item.product.images[index] || ""
    ).trim();

    if(file.startsWith("/media/")){
        file =
            process.cwd() + file;
    }
    else if(file.startsWith("media/")){
        file =
            process.cwd() + "/" + file;
    }

    if(
        !file ||
        !fs.existsSync(file)
    ){
        debug(
            `상품 이미지 없음 : ${file}`
        );

        sceneNo++;

        continue;
    }

    images.push({

        scene:sceneNo,

        sceneType:item.sceneType,

        keyword:"PRODUCT",

        subject:item.subject,

        searchSubject:item.searchSubject,

        searchHint:item.searchHint,

        file,

        provider:"PRODUCT"

    });

    sceneNo++;

    continue;
}


const keywordScore = text=>{

    text = String(text).toLowerCase();

    let score = 0;

    if(!text.includes(" ")) score += 100;

    if(text.includes("macro")) score += 80;

    if(text.includes("close up")) score += 70;

    if(text.includes("underwater")) score += 60;

    if(text.includes("natural habitat")) score += 60;

    if(text.includes("forest")) score += 40;

    if(text.includes("garden")) score += 40;

    if(text.includes("road")) score += 40;

    if(text.includes("interior")) score += 35;

    if(text.includes("dashboard")) score += 30;

    if(text.includes("engine")) score += 30;

    return score;

};

if(
    Array.isArray(item.imageQueries) &&
    item.imageQueries.length
){

    keywords.push(
        ...item.imageQueries
    );

}
else{

    if(item.searchSubject){

        keywords.push(
            item.searchSubject
        );

    }

}

// Longform keeps the Director's two queries in their original order.
if(item.mediaMode !== "image" && item.category !== "history") keywords.sort(
    (a,b)=>
        keywordScore(b)-
        keywordScore(a)
);

const imageLimit = item.imageLimit || 1;

let imageNo = 1;
let reviewAttempts = 0;

const MAX_REVIEW_ATTEMPTS = 5;

// History-only: allow one bounded AI re-plan of the visual search target.
// Narration, subtitles and scene order are never changed here.
for(let historyVisualRound = 0; historyVisualRound < (item.category === "history" ? 2 : 1); historyVisualRound++){

for(const keyword of keywords){

    if(imageNo > imageLimit){
        break;
    }

    if(reviewAttempts >= MAX_REVIEW_ATTEMPTS){
        break;
    }

    reviewAttempts++;

    debug(
        `[IMAGE] Scene ${sceneNo} REVIEW ATTEMPT ${reviewAttempts}/${MAX_REVIEW_ATTEMPTS} : ${keyword}`
    );

    try{

        const cache =
            cacheFile(keyword);

const imageResults =
    await searchImage(
        keyword,
        item,
        usedUrls
    );

const imageOnly =
    item.mediaMode === "image" ||
    item.imageOnly === true ||
    item.category === "history";

const videoResults =
    imageOnly
        ? []
        : await searchVideo(
            keyword,
            item,
            usedUrls
        );

const imageCandidates =
    Array.isArray(imageResults)
        ? imageResults
        : imageResults
            ? [imageResults]
            : [];

const videoCandidates =
    Array.isArray(videoResults)
        ? videoResults
        : videoResults
            ? [videoResults]
            : [];

for(const candidate of imageCandidates){
    candidate.mediaType = "image";
}

for(const candidate of videoCandidates){
    candidate.mediaType = "video";
}

const mediaCandidates = [
    ...imageCandidates,
    ...videoCandidates
]
.filter(
    candidate =>
        candidate?.url &&
        !usedUrls.has(candidate.url)
);

debug(
    `[MEDIA COMPETITION] Scene ${sceneNo}`,
    `IMAGE_CANDIDATES=${imageCandidates.length}`,
    `VIDEO_CANDIDATES=${videoCandidates.length}`,
    `TOTAL=${mediaCandidates.length}`
);

// History uses only reviewed still images; generic stock clips must not win.
const result =
    selectBestMedia(
        item.category === "history"
            ? mediaCandidates.filter(candidate => candidate.mediaType === "image")
            : mediaCandidates
    );

console.log(
    `[MEDIA WINNER] Scene ${sceneNo}`,
    `TYPE=${result?.mediaType || "NONE"}`,
    `PROVIDER=${result?.provider || "NONE"}`,
    `SCORE=${result?.score || 0}`,
    `URL=${result?.url ? "YES" : "NO"}`
);

if(!result){
    debug(
        `[IMAGE] Scene ${sceneNo} IMAGE+VIDEO REVIEW FAIL ${reviewAttempts}/${MAX_REVIEW_ATTEMPTS} : ${keyword}`
    );
    continue;
}

result.mediaType =
    result.mediaType || "image";

        result.subject =
            item.subject || "";

        result.coreSubject =
            item.coreSubject || "";

        result.searchName =
            item.searchName || "";

        result.category =
            item.category || "";

        result.searchSubject =
            item.searchSubject || "";

        result.searchHint =
            item.searchHint || "";

        result.sceneType =
            item.sceneType || "global";

        if(
            usedUrls.has(result.url)
        ){

            debug(
                `중복 이미지 : ${keyword}`
            );

            continue;
        }

        usedUrls.add(
            result.url
        );

let file;

console.log(
    `[MEDIA DOWNLOAD] Scene ${sceneNo}`,
    `TYPE=${result.mediaType}`,
    `PROVIDER=${result.provider}`,
    `SCORE=${result.score || 0}`
);

if(
    result.mediaType === "video"
){

    file =
        path.join(
            "media/video",
            `scene_${sceneNo}_stock.mp4`
        );

    await downloadVideo(
        result.url,
        file
    );

}
else{

    file =
        path.join(
            IMAGE_DIR,
            `scene_${sceneNo}_${imageNo}.jpg`
        );

    await downloadImage(
        result.url,
        file,
        item.category === "history" ? { historyArchive: true, provider: result.provider } : {}
    );

}

if(
    !fs.existsSync(file)
){
    continue;
}

const size =
    fs.statSync(file).size;

const minimumSize =
    result.mediaType === "video"
        ? 10000
        : 5000;

if(
    size < minimumSize
){

    fs.unlinkSync(file);

    continue;
}

if(
    result.mediaType !== "video"
){

    fs.copyFileSync(
        file,
        cache
    );

}

        images.push({

            scene:sceneNo,

            sceneType:item.sceneType,

            keyword,

            subject:item.subject,

            coreSubject:item.coreSubject,

            searchSubject:item.searchSubject,

            searchHint:item.searchHint,

            file,

            provider:result.provider,

            score:result.score || 0,

mediaType:
    result.mediaType || "image",

            width:result.width,

            height:result.height,

            imageType:"fallback"

        });

        imageNo++;

    }

    catch(e){

        if(item.category === "history"){
            console.error(`[HISTORY IMAGE ERROR] Scene ${sceneNo} attempt=${reviewAttempts} :`, e?.stack || e);
        }
        debug(
            `[IMAGE] Scene ${sceneNo} REVIEW ERROR ${reviewAttempts}/${MAX_REVIEW_ATTEMPTS} : ${e.message}`
        );

    }

}

if(imageNo > 1 || item.category !== "history" || historyVisualRound > 0){
    break;
}

try {
    const prompt = [
        "You are repairing the VISUAL SEARCH PLAN for one History Shorts scene.",
        "The original image searches found no historically accurate licensed archive image.",
        "Return ONLY JSON with coreSubject (English string), imageQueries (2-3 English strings), direction (Korean string).",
        "Choose ONE specific, readily searchable historical artifact, museum object, site or documented archival photograph directly relevant to the scene.",
        "coreSubject MUST be a short English noun phrase of 2-4 words, never a list joined by and/or, never a combination of an artifact and an archaeological site.",
        "Keep Pompeii and Herculaneum distinct: do not substitute a Herculaneum victim or site for a Pompeii victim or site. If narration is about Pompeii, use Pompeii-related visuals only.",
        "Use short archive-style search terms with one visual target per query.",
        "Do NOT claim a plaster cast is a skeleton, or a photograph is a CT scan.",
        "Do NOT change or invent any historical facts, narration, subtitles, names, dates or scene order.",
        "If the narration specifically requires unavailable scientific imagery, choose an accurate contextual artifact and clearly describe it as a contextual visual in direction, never as the actual scientific result.",
        "If no truthful visual is possible, return JSON with imageQueries: [].",
        "Scene narration: " + String(item.tts || item.script || ""),
        "Current visual subject: " + String(item.coreSubject || ""),
        "Current queries: " + JSON.stringify(keywords)
    ].join("\n");
    const response = String(await callAI(prompt));
    const match = response.match(/\{[\s\S]*\}/);
    const plan = match ? JSON.parse(match[0]) : null;
    const nextCore = String(plan?.coreSubject || "").trim();
    const nextQueries = Array.isArray(plan?.imageQueries)
        ? plan.imageQueries.map(q => String(q || "").trim()).filter(Boolean).slice(0,3)
        : [];
    if(!nextCore || !nextQueries.length) {
        console.log("[HISTORY VISUAL REPLAN] No safe replacement found");
        break;
    }
    item.coreSubject = nextCore;
    item.imageQueries = nextQueries;
    if(typeof plan.direction === "string" && plan.direction.trim()) item.direction = plan.direction.trim();
    keywords.splice(0, keywords.length, ...nextQueries);
    reviewAttempts = 0;
    console.log("[HISTORY VISUAL REPLAN]", JSON.stringify({scene:sceneNo, coreSubject:nextCore, imageQueries:nextQueries}));
} catch(error) {
    console.error("[HISTORY VISUAL REPLAN ERROR]", error.message);
    break;
}

}

if(item.category === "history"){
    console.log(`[HISTORY IMAGE SUMMARY] Scene ${sceneNo} accepted=${imageNo - 1} required=${imageLimit} attempts=${reviewAttempts}`);
}
if(
    imageNo === 1
){

    throw new Error(
        `[IMAGE] Scene ${sceneNo} 이미지 Reviewer 최종 실패 : coreSubject=${item.coreSubject || ""}, 최대 ${MAX_REVIEW_ATTEMPTS}회 시도`
    );

}

        sceneNo++;

    }

success(
    `IMAGE DOWNLOAD ${images.length}장`
);

    return images;

}
