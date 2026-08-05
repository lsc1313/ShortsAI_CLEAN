import fs from "fs";

const IMAGE_DIR = "media/images";

export function ensureDir(){

    if(!fs.existsSync(IMAGE_DIR)){

        fs.mkdirSync(
            IMAGE_DIR,
            {
                recursive:true
            }
        );

    }

}
