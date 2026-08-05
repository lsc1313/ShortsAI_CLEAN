import axios from "axios";

const PEXELS_KEY = process.env.PEXELS_API_KEY;

export async function searchPexels(keyword){

    if(
        !PEXELS_KEY ||
        !keyword
    ){
        return null;
    }

    try{

        const res = await axios.get(

            "https://api.pexels.com/v1/search",

            {

                headers:{

                    Authorization:PEXELS_KEY

                },

                params:{

                    query:keyword,

                    orientation:"portrait",

                    per_page:20

                },

                timeout:30000

            }

        );

        if(
            !res.data ||
            !res.data.photos ||
            !res.data.photos.length
        ){

            return null;

        }

        const photos = res.data.photos.filter(photo=>{

            const alt = String(
                photo.alt || ""
            ).toLowerCase();

            if(

                alt.includes("people") ||
                alt.includes("person") ||
                alt.includes("man") ||
                alt.includes("woman") ||
                alt.includes("human") ||
                alt.includes("portrait")

            ){

                return false;

            }

            return (

                photo.width >= 700 &&

                photo.height >= 1000

            );

        });

        if(!photos.length){

            return null;

        }

return photos.map(photo=>{

    const score =

        (photo.width >= 1920 ? 40 : 20) +

        (photo.height >= 1080 ? 30 : 15) +

        ((photo.alt || "").length > 15 ? 20 : 0) +

        10;

    return{

        provider:"Pexels",

        url:photo.src.large2x,

        width:photo.width,

        height:photo.height,

        tags:photo.alt || "",

        score

    };

});

    }

    catch{

        return null;

    }

}
