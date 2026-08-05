import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import {
    success,
    debug
} from "./logger.js";

const THUMB_DIR =
"media/thumbnail";



function ensureDir(){

    if(
        !fs.existsSync(THUMB_DIR)
    ){

        fs.mkdirSync(
            THUMB_DIR,
            {
                recursive:true
            }
        );

    }

}






export async function createThumbnail(

aiData,

images

){


ensureDir();



let image="";



if(
images &&
images.length
){

    image =
    images[0].file ||
    images[0];

}



if(
!image ||
!fs.existsSync(image)
){

    throw new Error(
        "썸네일 이미지 없음"
    );

}





const output =

path.join(
    THUMB_DIR,
    "thumbnail.jpg"
);






const text =

(
aiData.hook ||
"놀라운 사실"
)
.replace(
    /"/g,
    ""
);







execSync(

`ffmpeg -y \
-loop 1 \
-i "${image}" \
-vf "scale=1280:720,drawtext=fontfile=/system/fonts/NotoSansCJK-Regular.ttc:text='${text}':fontcolor=white:fontsize=80:borderw=5:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2" \
-frames:v 1 \
"${output}"`

,

{
stdio:"ignore"
}

);






success(
    "THUMBNAIL COMPLETE"
);


return {

file:output

};



}
