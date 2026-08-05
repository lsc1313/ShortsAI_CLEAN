import { reviewImage } from "../ai/reviewerAI.js";
import { providers } from "./provider.js";
import { debug } from "../logger.js";

export async function searchImage(
    keyword,
    scene
){

    const primarySubject = String(

        scene?.subject ||

        scene?.searchSubject ||

        keyword ||

        ""

    )
    .trim()
    .toLowerCase();

    for(const provider of providers){

        let candidateKeyword = "";

        let result;

        try{

            const searchList = [];

            searchList.push(keyword);

            const words = keyword.split(" ");

            if(words.length > 2){

                searchList.push(
                    words.slice(0,-1).join(" ")
                );

            }

            if(scene.searchName){

                searchList.push(scene.searchName);

            }

            if(scene.subject){

                searchList.push(scene.subject);

            }

            const uniqueSearch = [
                ...new Set(searchList)
            ];

            for(const searchWord of uniqueSearch){

                result = await provider.search(
                    searchWord
                );

                if(result){

                    candidateKeyword = searchWord;

                    break;

                }

            }

        }

        catch(e){

debug(
    `[${provider.name}] ERROR : ${e.message}`
);

            continue;

        }

        if(!result){
            continue;
        }

        const list = Array.isArray(result)

            ? result

            : [result];

        const reviewed = [];

        for(const candidate of list){

            if(!candidate?.url){

                continue;

            }

            candidate.provider = provider.name;

            candidate.keyword =

                candidateKeyword ||

                keyword;

            candidate.primarySubject = String(

                primarySubject ||

                keyword

            )

            .split(",")

            [0]

            .replace(/\bclose up\b/ig,"")

            .replace(/\brealistic\b/ig,"")

            .replace(/\bdocumentary photography\b/ig,"")

            .replace(/\bwide shot\b/ig,"")

            .replace(/\s+/g," ")

            .trim()

            .toLowerCase();

            reviewed.push(candidate);

        }

        reviewed.sort((a,b)=>{

            const score = item=>{

                let s = item.score || 0;

                if(item.width >= 1920) s += 20;

                if(item.height >= 1080) s += 20;

                if(item.provider === "Pexels") s += 8;

                if(item.provider === "Pixabay") s += 5;

                const text = String(

                    item.keyword || ""

                ).toLowerCase();

                if(text.includes("macro")) s += 15;

                if(text.includes("documentary")) s += 15;

                if(text.includes("realistic")) s += 10;

                if(text.includes("wildlife")) s += 8;

                if(text.includes("close up")) s += 8;

                return s;

            };

            return score(b) - score(a);

        });

        for(const candidate of reviewed){

            const reviewedImage = await reviewImage(

                candidate,

                scene

            );

            if(!reviewedImage){

                continue;

            }

debug(
    `[${provider.name}] PASS : ${candidateKeyword || keyword}`
);

            return reviewedImage;

        }

debug(
    `[${provider.name}] REJECT`
);

    }

    return null;

}
