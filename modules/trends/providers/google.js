import { getRSS } from "./rss.js";
import { parseRSS } from "../parser/rss.js";
import { createTopic } from "../utils/topic.js";

const GOOGLE_NEWS_RSS =
"https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko";

export async function getGoogleTrends(channel){

    const xml=await getRSS(GOOGLE_NEWS_RSS);

    if(!xml){

        return [];

    }

    const titles=parseRSS(xml);

    return titles.map(title=>

        createTopic({

            title,

            score:20,

            source:"google",

            category:channel

        })

    );

}
