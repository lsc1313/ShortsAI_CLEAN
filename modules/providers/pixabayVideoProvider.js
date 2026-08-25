import axios from "axios";

const PIXABAY_KEY = process.env.PIXABAY_API_KEY;

export async function searchPixabayVideo(keyword){

    if(
        !PIXABAY_KEY ||
        !keyword
    ){
        return null;
    }

    try{

        const res = await axios.get(
            "https://pixabay.com/api/videos/",
            {
                params:{
                    key:PIXABAY_KEY,
                    q:keyword,
                    lang:"en",
                    video_type:"film",
                    safesearch:true,
                    min_width:720,
                    min_height:720,
                    order:"popular",
                    per_page:5
                },
                timeout:30000
            }
        );

        const hits =
            res.data?.hits || [];

        if(!hits.length){
            return null;
        }

        const candidates = [];

        for(const video of hits){

            const versions =
                video.videos || {};

            const version =
                versions.large?.url
                    ? versions.large
                    : versions.medium?.url
                        ? versions.medium
                        : versions.small?.url
                            ? versions.small
                            : null;

            if(!version?.url){
                continue;
            }

            const width =
                Number(version.width || 0);

            const height =
                Number(version.height || 0);

            if(
                width < 720 ||
                height < 720
            ){
                continue;
            }

            const score =
                (width >= 1920 ? 40 : 20) +
                (height >= 1080 ? 30 : 15) +
                (height > width ? 25 : 0) +
                Math.min(
                    20,
                    Number(video.likes || 0) / 20
                );

            candidates.push({

                provider:"Pixabay Video",

                url:version.url,

                width,

                height,

                duration:
                    Number(video.duration || 0),

                tags:
                    video.tags || "",

                keyword,

                score

            });

        }

        candidates.sort(
            (a,b)=>
                b.score-a.score
        );

        return candidates;

    }

    catch{

        return null;

    }

}
