import axios from "axios";
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
if(item.mediaMode !== "image") keywords.sort(
    (a,b)=>
        keywordScore(b)-
        keywordScore(a)
);

const imageLimit = item.imageLimit || 1;

let imageNo = 1;
let reviewAttempts = 0;

const MAX_REVIEW_ATTEMPTS = 5;

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
    item.imageOnly === true;

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

const result =
    selectBestMedia(
        mediaCandidates
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
        file
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

        debug(
            `[IMAGE] Scene ${sceneNo} REVIEW ERROR ${reviewAttempts}/${MAX_REVIEW_ATTEMPTS} : ${e.message}`
        );

    }

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
