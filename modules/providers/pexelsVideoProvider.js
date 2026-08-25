import axios from "axios";

const PEXELS_KEY =
    process.env.PEXELS_API_KEY;

export async function searchPexelsVideo(keyword){

    if(
        !PEXELS_KEY ||
        !keyword
    ){
        return null;
    }

    try{

        const res =
            await axios.get(
                "https://api.pexels.com/v1/videos/search",
                {
                    headers:{
                        Authorization:
                            PEXELS_KEY
                    },
                    params:{
                        query:keyword,
                        orientation:"portrait",
                        size:"medium",
                        per_page:5
                    },
                    timeout:30000
                }
            );

        const videos =
            res.data?.videos || [];

        if(!videos.length){
            return null;
        }

        const candidates = [];

        for(const video of videos){

            const files =
                Array.isArray(
                    video.video_files
                )
                    ? video.video_files
                    : [];

            const usable =
                files
                    .filter(file =>
                        file?.link &&
                        file?.file_type ===
                            "video/mp4" &&
                        Number(file.width || 0) >= 720 &&
                        Number(file.height || 0) >= 720
                    )
                    .sort(
                        (a,b)=>
                            (
                                Number(b.width || 0) *
                                Number(b.height || 0)
                            ) -
                            (
                                Number(a.width || 0) *
                                Number(a.height || 0)
                            )
                    );

            if(!usable.length){
                continue;
            }

            const file =
                usable[0];

            const width =
                Number(file.width || 0);

            const height =
                Number(file.height || 0);

            const score =
                (width >= 1920 ? 40 : 20) +
                (height >= 1080 ? 30 : 15) +
                (height > width ? 25 : 0) +
                (Number(video.duration || 0) >= 5 ? 10 : 0);

            candidates.push({

                provider:"Pexels Video",

                url:file.link,

                width,

                height,

                duration:
                    Number(
                        video.duration || 0
                    ),

                tags:
                    Array.isArray(video.tags)
                        ? video.tags.join(" ")
                        : "",

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
