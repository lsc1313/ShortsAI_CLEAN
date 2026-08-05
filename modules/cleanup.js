import fs from "fs";
import path from "path";

const KEEP = new Set([

    ".gitkeep",

    ".nomedia"

]);

const TARGETS = [

    "media/images",

    "media/audio",

    "media/subtitles",

    "media/video",

    "media/video/temp",

    "media/temp",

    "media/thumbnails",

    "logs",

    "temp"

];

function remove(target){

    if(!fs.existsSync(target)){
        return;
    }

    for(const name of fs.readdirSync(target)){

if(
    KEEP.has(name)
){
    continue;
}

if(
    target.includes("media/video") &&
    (
        name==="output.mp4" ||
        name==="thumbnail.jpg"
    )
){
    continue;
}

        const file = path.join(target,name);

        try{

            const stat = fs.statSync(file);

            if(stat.isDirectory()){

                fs.rmSync(file,{
                    recursive:true,
                    force:true
                });

            }else{

                fs.unlinkSync(file);

            }

        }

        catch(e){

            console.log(
                "[CLEAN]",
                e.message
            );

        }

    }

}

export function cleanWorkspace(){

    console.log("");
    console.log("===== AUTO CLEAN =====");

    for(const dir of TARGETS){

        remove(dir);

    }

console.log(
    "[CLEAN] Workspace Ready"
);

}

export function cleanAfterUpload(){

    console.log("");
    console.log("===== UPLOAD CLEAN =====");

remove("media/images");
remove("media/audio");
remove("media/subtitles");
remove("media/temp");
remove("media/video/temp");
remove("temp");
remove("logs");

console.log(
    "[CLEAN] Upload Complete"
);

}

export function cleanBeforeJob(){

    console.log("");
    console.log("===== JOB CLEAN =====");

for(const dir of TARGETS){

        if(!fs.existsSync(dir)){
            continue;
        }

        for(const file of fs.readdirSync(dir)){

            if(file === ".gitkeep"){
                continue;
            }

            if(
                dir==="media/video" &&
                file==="output.mp4"
            ){
                continue;
            }

            const target = path.join(dir,file);

            try{

                const stat = fs.statSync(target);

                if(stat.isDirectory()){

                    fs.rmSync(target,{
                        recursive:true,
                        force:true
                    });

                }

                else{

                    fs.unlinkSync(target);

                }

            }

            catch{}

        }

    }

console.log(
    "[CLEAN] Job Ready"
);

}
