import { imageHash } from "image-hash";

export function createHash(file){

    return new Promise((resolve,reject)=>{

        imageHash(

            file,

            16,

            true,

            (error,hash)=>{

                if(error){

                    reject(error);
                    return;

                }

                resolve(hash);

            }

        );

    });

}

export function hashDistance(a,b){

    if(!a || !b){

        return Number.MAX_SAFE_INTEGER;

    }

    const len =
        Math.min(
            a.length,
            b.length
        );

    let diff = 0;

    for(
        let i=0;
        i<len;
        i++
    ){

        if(
            a[i]!==b[i]
        ){

            diff++;

        }

    }

    return diff;

}

export function hashScore(a,b){

    const distance =
        hashDistance(a,b);

    const maxLen =
        Math.max(
            a.length,
            b.length
        );

    return Math.round(

        (1-distance/maxLen)

        *100

    );

}
