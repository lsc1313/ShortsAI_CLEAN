import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { providers } from "./image/provider.js";
import { searchImage } from "./image/search.js";
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

export async function createImage(script){

    ensureDir();

    const images = [];
    const usedUrls = new Set();

    let sceneNo = 1;

    for(const item of script){

const keywords = [];

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

keywords.sort(
    (a,b)=>
        keywordScore(b)-
        keywordScore(a)
);

const imageLimit = item.imageLimit || 1;

let imageNo = 1;

for(const keyword of keywords){

    if(imageNo > imageLimit){

        break;

    }

try{
    const cache = cacheFile(keyword);

    if(fs.existsSync(cache)){

        const file = path.join(

            IMAGE_DIR,

            `scene_${sceneNo}_${imageNo}.jpg`

        );

        fs.copyFileSync(

            cache,

            file

        );

        images.push({

            scene:sceneNo,

            sceneType:item.sceneType,

            keyword,

            subject:item.subject,

            searchSubject:item.searchSubject,

            searchHint:item.searchHint,

            file,

            provider:"CACHE",

            score:100

        });

debug(
    `[CACHE] ${keyword}`
);

        imageNo++;

        continue;

    }

const result = await searchImage(
    keyword,
    item
);

if(result){

    result.subject =
        item.subject || "";

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

}

                if(!result){

debug(
    `검색 실패 : ${keyword}`
);

                    continue;

                }

                if(usedUrls.has(result.url)){

debug(
    `중복 이미지 : ${keyword}`
);

                    continue;

                }

                usedUrls.add(result.url);

                const file = path.join(

                    IMAGE_DIR,

                    `scene_${sceneNo}_${imageNo}.jpg`

                );

                await downloadImage(
                    result.url,
                    file
                );

                if(!fs.existsSync(file)){
                    continue;
                }

                const size = fs.statSync(file).size;

                if(size<5000){

                    fs.unlinkSync(file);

                    continue;

                }

                fs.copyFileSync(
                    file,
                    cache
                );

images.push({

    scene:sceneNo,

    sceneType:item.sceneType,

    keyword,

    subject:item.subject,

    searchSubject:item.searchSubject,

    searchHint:item.searchHint,

    file,

    provider:result.provider,

    score:result.score||0,

    width:result.width,

    height:result.height,

    imageType:"fallback"

});

imageNo++;

if(imageNo > imageLimit){

    break;

}

            }

            catch(e){

debug(
    "검색 오류:",
    e.message
);

            }

        }

        if(

            !images.some(

                img=>img.scene===sceneNo

            )

        ){


let fallback = "";

if(item.subject){

    fallback = item.subject;

}
else if(item.imageQueries?.length){

    fallback = item.imageQueries[0];

}
else if(item.topic){

    fallback = item.topic;

}
else{

    fallback = "nature";

}

fallback = normalizeKeyword(fallback);

            try{

const result = await searchImage(
    fallback,
    item
);

if(result){

    result.subject =
        item.subject || "";

    result.searchName =
        item.searchName || "";

    result.category =
        item.category || "";

    result.searchSubject =
        item.searchSubject || "";

    result.searchHint =
        item.searchHint || "";

}

                if(result){

                    const file = path.join(

                        IMAGE_DIR,

                        `scene_${sceneNo}_fallback.jpg`

                    );

                    await downloadImage(

                        result.url,

                        file

                    );

                    if(

                        fs.existsSync(file) &&

                        fs.statSync(file).size>5000

                    ){

images.push({

    scene:sceneNo,

    sceneType:
        item.sceneType,

    keyword:fallback,

    subject:
        item.subject,

    searchSubject:
        item.searchSubject,

    searchHint:
        item.searchHint,

    file,

    provider:
        result.provider,

    score:
        result.score||0

});

                    }

                }

            }

            catch(e){

debug(
    `Fallback 실패 : ${e.message}`
);

            }

        }

        sceneNo++;

    }

success(
    `IMAGE DOWNLOAD ${images.length}장`
);

    return images;

}
