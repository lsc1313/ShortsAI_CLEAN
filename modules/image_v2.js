import axios from "axios";
import fs from "fs";
import path from "path";

import { searchPixabay } from "./providers/pixabayProvider.js";
import { searchPexels } from "./providers/pexelsProvider.js";
import { searchPollinations } from "./providers/pollinationsProvider.js";

const IMAGE_DIR="media/images";
const CACHE_DIR="media/cache";

function ensureDir(){

    fs.mkdirSync(IMAGE_DIR,{recursive:true});
    fs.mkdirSync(CACHE_DIR,{recursive:true});

}

async function download(url,file){

    const res=await axios.get(url,{
        responseType:"arraybuffer",
        timeout:30000
    });

    fs.writeFileSync(file,res.data);

}

function cacheName(keyword){

    return path.join(

        CACHE_DIR,

        keyword
        .replace(/[^\w]/g,"_")
        .toLowerCase()+".jpg"

    );

}

async function searchAll(keyword){

    const providers=[

        {
            name:"Pixabay",
            fn:searchPixabay
        },

        {
            name:"Pexels",
            fn:searchPexels
        },

        {
            name:"Pollinations",
            fn:searchPollinations
        }

    ];

    const results=[];

    for(const provider of providers){

        try{

            const res=await provider.fn(keyword);

            const list=Array.isArray(res)?res:[res];

            for(const item of list){

                if(!item?.url) continue;

                results.push({

                    ...item,

                    provider:provider.name,

                    keyword

                });

            }

        }catch{}

    }

    return results;

}

function calcScore(item){

    let score = item.score || 0;

    const keyword = String(item.keyword || "").toLowerCase();

    if(keyword.includes("documentary")) score += 15;
    if(keyword.includes("wildlife")) score += 12;
    if(keyword.includes("macro")) score += 10;
    if(keyword.includes("close up")) score += 8;
    if(keyword.includes("action")) score += 8;
    if(keyword.includes("wide shot")) score += 6;

    if(item.width >= 1920) score += 10;
    if(item.height >= 1080) score += 10;

    return score;

}

function chooseImage(results){

    if(!results.length){

        return null;

    }

    results.sort(

        (a,b)=>

            calcScore(b)-calcScore(a)

    );

    const history =

        global.providerHistory ||= [];

    for(const item of results){

        const last =

            history[history.length-1];

        if(

            results.length>1 &&

            last===item.provider

        ){

            continue;

        }

        history.push(item.provider);

        if(history.length>20){

            history.shift();

        }

        return item;

    }

    return results[0];

}

export async function createImage(script){

    ensureDir();

    const images = [];
    const usedUrls = new Set();

let sceneNo = 1;

for (const scene of script) {

    const keywords = [

        ...(Array.isArray(scene.images)
            ? scene.images
            : []),

        ...(Array.isArray(scene.imagePrompts)
            ? scene.imagePrompts
            : []),

        ...(Array.isArray(scene.keywords)
            ? scene.keywords
            : []),

        ...(Array.isArray(scene.plan?.imagePrompts)
            ? scene.plan.imagePrompts
            : []),

        ...(Array.isArray(scene.plan?.keywords)
            ? scene.plan.keywords
            : [])

    ].filter(Boolean);

    let imageNo = 1;

        for(const keyword of keywords){

            const cache = cacheName(keyword);

            if(fs.existsSync(cache)){

                const file = path.join(

                    IMAGE_DIR,

                    `scene_${sceneNo}_${imageNo}.jpg`

                );

                fs.copyFileSync(cache,file);

                images.push({

                    scene:sceneNo,

                    keyword,

                    file,

                    provider:"CACHE",

                    score:100

                });

                imageNo++;

                if(imageNo>3) break;

                continue;

            }

            const candidates = await searchAll(keyword);

            const selected = chooseImage(candidates);

            if(!selected){

                continue;

            }

            if(usedUrls.has(selected.url)){

                continue;

            }

            usedUrls.add(selected.url);

            const file = path.join(

                IMAGE_DIR,

                `scene_${sceneNo}_${imageNo}.jpg`

            );

            try{

                await download(

                    selected.url,

                    file

                );

            }catch{

                continue;

            }

            if(

                !fs.existsSync(file) ||

                fs.statSync(file).size<5000

            ){

                continue;

            }

            fs.copyFileSync(

                file,

                cache

            );

            images.push({

                scene:sceneNo,

                keyword,

                file,

                provider:selected.provider,

                score:calcScore(selected)

            });

            console.log(

                `[${selected.provider}]`,

                keyword

            );

            imageNo++;

            if(imageNo>3){

                break;

            }

        }

        sceneNo++;

    }

    console.log(

        "멀티 이미지 생성 완료 :",

        images.length

    );

    return images;

}


