const BANNED = [

    "background",
    "wallpaper",
    "texture",
    "vector",
    "illustration",
    "icon",
    "logo",
    "watermark",
    "text"

];

export function validateImageKeywords(images){

    if(!Array.isArray(images)){
        return false;
    }

    if(images.length===0){
        return false;
    }

    const keywords = images
        .map(v=>String(v).toLowerCase().trim())
        .filter(Boolean);

    if(!keywords.length){
        return false;
    }

    for(const keyword of keywords){

        for(const banned of BANNED){

            if(keyword.includes(banned)){
                return false;
            }

        }

    }

    const subject = keywords[0]
        .replace(/realistic/gi,"")
        .replace(/documentary/gi,"")
        .replace(/photography/gi,"")
        .replace(/close up/gi,"")
        .replace(/wide shot/gi,"")
        .replace(/macro/gi,"")
        .replace(/highly detailed/gi,"")
        .replace(/\s+/g," ")
        .trim();

    if(subject.length < 3){
        return false;
    }

    return true;

}
