import { execSync } from "child_process";

export function duration(file){

    try{

        const result = execSync(

            `ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`,

            {
                encoding:"utf8"
            }

        );

        const value = Number(result.trim());

        return value || 5;

    }

    catch(e){

        return 5;

    }

}

