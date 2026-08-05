export function cleanKeyword(text){

    if(!text){
        return null;
    }

    let keyword = String(text)
        .replace(/[^\w\s-]/g," ")
        .replace(/\s+/g," ")
        .trim();

    if(keyword.length < 3){
        return null;
    }

    return keyword;

}

export function normalizeKeyword(keyword){

    if(!keyword){
        return null;
    }

    keyword = cleanKeyword(keyword);

    if(!keyword){
        return null;
    }

    keyword = keyword
        .replace(/\bpeople\b/ig,"")
        .replace(/\bperson\b/ig,"")
        .replace(/\bwoman\b/ig,"")
        .replace(/\bman\b/ig,"")
        .replace(/\bgirl\b/ig,"")
        .replace(/\bboy\b/ig,"")
        .replace(/\bhuman\b/ig,"")
        .replace(/\bfamily\b/ig,"")
        .replace(/\bowner\b/ig,"")
        .replace(/\bchild\b/ig,"")
        .replace(/\bkids\b/ig,"")
        .replace(/\btechnology\b/ig,"")
        .replace(/\bscience\b/ig,"")
        .replace(/\bbackground\b/ig,"")
        .replace(/\billustration\b/ig,"")
        .replace(/\bvector\b/ig,"")
        .replace(/\bicon\b/ig,"")
        .replace(/\s+/g," ")
        .trim();

    if(!keyword){
        return null;
    }

    const lower = keyword.toLowerCase();

    if(
        lower.includes("golden retriever") ||
        lower.includes("shiba inu") ||
        lower.includes("border collie") ||
        lower.includes("husky") ||
        lower.includes("poodle")
    ){
        return keyword;
    }

    if(lower === "dog"){
        return "Golden Retriever dog";
    }

    if(lower === "cat"){
        return "British Shorthair cat";
    }

    return keyword;

}

export function createSearchList(item){

    const list = [];

    if(Array.isArray(item.images)){
        list.push(...item.images);
    }

    if(item.imagePrompt){
        list.push(item.imagePrompt);
    }

    if(item.title){
        list.push(item.title);
    }

    if(item.voice){
        list.push(item.voice);
    }

    return [
        ...new Set(
            list
                .map(normalizeKeyword)
                .filter(Boolean)
        )
    ];

}
