import { validateImageKeywords } from "../core/reviewer.js";

export async function reviewImage(
    candidate,
    scene
){

    if(!candidate){
        return null;
    }

    const tags = String(
        [
            candidate.tags,
            candidate.keyword,
            candidate.description,
            candidate.alt,
            scene?.searchSubject,
            scene?.searchHint,
            candidate.primarySubject
        ]
        .filter(Boolean)
        .join(" ")
    ).toLowerCase();

    if(
        !validateImageKeywords([tags])
    ){
        console.log(
            `[${candidate.provider}] Reject : Keyword`
        );
        return null;
    }

const subject = String(
    candidate.primarySubject || ""
)
.replace(/\brealistic\b/ig,"")
.replace(/\bdocumentary\b/ig,"")
.replace(/\bphotography\b/ig,"")
.replace(/\bwide shot\b/ig,"")
.replace(/\bclose up\b/ig,"")
.replace(/\bportrait\b/ig,"")
.replace(/\bhighly detailed\b/ig,"")
.replace(/\bnatural behavior\b/ig,"")
.replace(/\s+/g," ")
.trim()
.toLowerCase();

if(!subject){
    return null;
}

if(
    !tags.includes(subject)
){

    const ok = subject
        .split(" ")
        .filter(word=>word.length>2)
        .every(word=>tags.includes(word));

    if(!ok){

        console.log(
            `[${candidate.provider}] Reject : Subject`,
            subject
        );

        return null;

    }

}

candidate.score = candidate.score || 0;

if(candidate.width >= 1920){
    candidate.score += 20;
}

if(candidate.height >= 1080){
    candidate.score += 20;
}

console.log(
    `[${candidate.provider}] PASS`,
    candidate.keyword,
    "SCORE:",
    candidate.score
);

    return candidate;

}



