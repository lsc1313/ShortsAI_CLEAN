import axios from "axios";
import fs from "fs";

export async function downloadImage(
    url,
    file,
    options = {}
){

    if(options.historyArchive){
        console.log("[HISTORY IMAGE REQUEST]", JSON.stringify({
            provider: options.provider || "unknown",
            url
        }));
    }

    let res;
    try {
        res = await axios.get(

        url,

        {
            responseType:"arraybuffer",
            timeout:30000,
            headers: options.historyArchive ? {
                "User-Agent": "ShortsAI-History/1.0 (educational archive image retrieval)",
                "Accept": "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
                ...(options.provider === "WikimediaCommons" ? { "Referer": "https://commons.wikimedia.org/" } : {}),
                ...(options.provider === "ArtInstituteChicago" ? { "Referer": "https://www.artic.edu/" } : {})
            } : undefined
        }

    );

    } catch(error) {
        if(options.historyArchive){
            console.error("[HISTORY IMAGE HTTP ERROR]", JSON.stringify({
                provider: options.provider || "unknown",
                status: error.response?.status || null,
                url,
                message: error.message
            }));
        }
        throw error;
    }

    fs.writeFileSync(
        file,
        res.data
    );

}
