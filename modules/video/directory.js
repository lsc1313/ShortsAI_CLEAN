import fs from "fs";

const VIDEO_DIR = "media/video";

export { VIDEO_DIR };

export function mkdir(){

    if(!fs.existsSync(VIDEO_DIR)){

        fs.mkdirSync(
            VIDEO_DIR,
            {
                recursive:true
            }
        );

    }

}
