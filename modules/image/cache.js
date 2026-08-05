import fs from "fs";
import path from "path";

const CACHE_DIR = "media/cache";

export function ensureCache(){

    if(!fs.existsSync(CACHE_DIR)){

        fs.mkdirSync(
            CACHE_DIR,
            {
                recursive:true
            }
        );

    }

}

export function cacheFile(keyword){

    return path.join(

        CACHE_DIR,

        keyword
            .replace(/[^\w]/g,"_")
            .toLowerCase() + ".jpg"

    );

}
