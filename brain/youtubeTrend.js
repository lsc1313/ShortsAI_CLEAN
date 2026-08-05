import { google } from "googleapis";

export async function getYoutubeTrendTopics(){

    const auth = process.env.YOUTUBE_API_KEY;

    if(!auth){

        console.log(

            "[Trend] API KEY 없음"

        );

        return [];

    }

    try{

        const youtube = google.youtube({

            version:"v3",

            auth

        });

const res = await youtube.search.list({

    part:[

        "snippet"

    ],

    maxResults:50,

    order:"date",

    regionCode:"KR",

    relevanceLanguage:"ko",

    q:

        "뉴스 OR AI OR 자동차 OR 동물",

    type:[

        "video"

    ]

});

return [

    ...new Set(

        res.data.items

        .map(

            x=>x.snippet.title

        )

        .map(

            title=>

                title

                .replace(/\[[^\]]+\]/g,"")

                .replace(/\([^)]+\)/g,"")

                .replace(/[#★▶🔥]/g,"")

                .trim()

        )

        .filter(

            title=>title.length>8

        )

    )

];

    }

    catch(e){

        console.log(

            "[Trend] 실패"

        );

        return [];

    }

}
