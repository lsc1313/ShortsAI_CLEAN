import axios from "axios";
import { debug } from "../logger.js";

const PIXABAY_KEY = process.env.PIXABAY_API_KEY;

export async function searchPixabay(keyword){

debug("[Pixabay] Provider Start");

    if(
        !PIXABAY_KEY ||
        !keyword
    ){
        return null;
    }

    try{

        const res = await axios.get(

            "https://pixabay.com/api/",

            {

                params:{

                    key:PIXABAY_KEY,

                    q:keyword,

                    image_type:"photo",

                    orientation:"vertical",

                    safesearch:true,

                    per_page:5

                },

                timeout:30000

            }

        );

        if(
            !res.data ||
            !res.data.hits ||
            !res.data.hits.length
        ){
            return null;
        }

        const photos = res.data.hits.filter(photo=>{

            const tags = String(
                photo.tags || ""
            ).toLowerCase();

            if(

                tags.includes("people") ||
                tags.includes("person") ||
                tags.includes("man") ||
                tags.includes("woman") ||
                tags.includes("human") ||
                tags.includes("portrait")

            ){

                return false;

            }

            return true;

        });

        if(!photos.length){

            return null;

        }

return photos.map(photo=>{

    const score =

        (photo.imageWidth >= 1920 ? 40 : 20) +

        (photo.imageHeight >= 1080 ? 30 : 15) +

        ((photo.tags || "").length > 15 ? 20 : 0) +

        ((photo.likes || 0) >= 50 ? 10 : 0);

    return{

        provider:"Pixabay",

        url:photo.largeImageURL,

        width:photo.imageWidth,

        height:photo.imageHeight,

        tags:photo.tags || "",

        score

    };

});

    }

    catch{

        return null;

    }

}
