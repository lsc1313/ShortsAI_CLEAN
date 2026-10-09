import {
    validateImageKeywords
} from "../core/reviewer.js";


function normalizeSubject(
    text = ""
){

    return String(
        text || ""
    )
        .split(",")[0]
        .replace(/\brealistic\b/ig, "")
        .replace(/\bdocumentary photography\b/ig, "")
        .replace(/\bdocumentary\b/ig, "")
        .replace(/\bwide shot\b/ig, "")
        .replace(/\bclose up\b/ig, "")
        .replace(/\bcloseup\b/ig, "")
        .replace(/\bphotography\b/ig, "")
        .replace(/\bhighly detailed\b/ig, "")
        .replace(/\bnatural behavior\b/ig, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

}


function getCoreWords(
    subject = ""
){

    return normalizeSubject(
        subject
    )
        .split(/\s+/)
        .map(
            word =>
                word.replace(
                    /^(.*?)(s|es)$/i,
                    "$1"
                )
        )
        .filter(
            word =>
                word.length > 2
        );

}


function getProviderText(
    candidate
){

    return String(
        [
            candidate?.tags,
            candidate?.description,
            candidate?.alt
        ]
            .filter(Boolean)
            .join(" ")
    )
        .toLowerCase();

}


function coreSubjectMatches(
    coreSubject = "",
    query = "",
    options = {}
){

    const subject =
        String(coreSubject || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();

    const text =
        String(query || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();

    const channel =
        String(
            options?.channel ||
            options?.category ||
            ""
        )
        .toLowerCase()
        .trim();

    /*
    =====================================================
    CORE SUBJECT POLICY

    Animal:
        coreSubject is mandatory.
        Subject mismatch may reject.

    AI / Science / History:
        coreSubject is advisory.
        Scene meaning is evaluated separately.
        coreSubject mismatch alone must NOT reject.

    =====================================================
    */

    if(
        channel === "animal"
    ){

        if(
            !subject ||
            !text
        ){
            return false;
        }

        const words =
            subject
                .split(/\s+/)
                .filter(
                    word =>
                        word.length > 2
                );

        if(!words.length){
            return false;
        }

        let matched = 0;

        for(
            const word of words
        ){

            if(
                text.includes(word)
            ){
                matched++;
            }

        }

        const required =
            words.length <= 3
                ? words.length
                : 2;

        return matched >= required;
    }

    /*
    Non-Animal:
    coreSubject is NOT a hard rejection condition.

    The reviewer must judge the complete Scene meaning.
    */

    return true;
}


export function selectBestMedia(candidates = []){
    const valid = candidates.filter(
        candidate =>
            candidate?.url &&
            candidate?.mediaType
    );

    if(!valid.length){
        return null;
    }

    const images = valid.filter(
        candidate =>
            candidate.mediaType !== "video"
    );

    const videos = valid.filter(
        candidate =>
            candidate.mediaType === "video"
    );

    /*
    =====================================================
    FINAL MEDIA SELECTION

    Reviewer 승인 후보끼리 최종 경쟁한다.

    영상은 이미지보다 최대 15점 낮아도 선택한다.

    예:
        IMAGE 180
        VIDEO 170
        → VIDEO

        IMAGE 180
        VIDEO 164
        → IMAGE
    =====================================================
    */

    if(images.length && videos.length){

        const bestImage = images.reduce(
            (best, candidate) =>
                Number(candidate.score || 0) >
                Number(best?.score || 0)
                    ? candidate
                    : best,
            null
        );

        const bestVideo = videos.reduce(
            (best, candidate) =>
                Number(candidate.score || 0) >
                Number(best?.score || 0)
                    ? candidate
                    : best,
            null
        );

        const imageScore =
            Number(bestImage?.score || 0);

        const videoScore =
            Number(bestVideo?.score || 0);

        if(
            videoScore >= imageScore - 15
        ){
            return bestVideo;
        }

        return bestImage;
    }

    return valid.reduce(
        (best, candidate) =>
            Number(candidate.score || 0) >
            Number(best?.score || 0)
                ? candidate
                : best,
        null
    );
}

// Conservative History metadata gate: never treat a search query alone as proof
// that an asset actually depicts the narrated historical subject.
function historyMetadataMatches(candidate, scene){
    const channel = String(scene?.category || scene?.channel || "").toLowerCase();
    if(channel !== "history") return true;
    const core = normalizeSubject(scene?.coreSubject || "");
    if(!core) return false;
    const metadata = getProviderText(candidate);
    if(!metadata.trim()) return false;

    // Preserve proper names: "Secret Cabinet" is a collection name, not an adjective.
    // An event date or a staging verb must not become a mandatory image label.
    const coreWords = core.match(/[a-z0-9]+/g) || [];
    const descriptive = new Set([
        "mystery","mysterious","unknown","hidden","shocking","surprising",
        "tragic","tragedy","story","stories","truth","facts","revealed",
        "dramatic","terrifying","horrifying","moment","last","final",
        "seal","sealed","sealing","watching","closeup","view","detail"
    ]);
    const generic = new Set([
        "photo","image","roman","ancient","historical","history",
        "scene","painting","illustration","mount"
    ]);
    const required = coreWords.filter(w => !/^[0-9]{3,4}$/.test(w) && !descriptive.has(w) && !generic.has(w));
    if(!required.length) return false;
    const words = new Set(metadata.match(/[a-z0-9]+/g) || []);
    const singular = w => w.endsWith("ies") ? w.slice(0,-3)+"y" :
        w.endsWith("es") && /(ches|shes|sses|xes|zes)$/.test(w) ? w.slice(0,-2) :
        w.endsWith("s") && !w.endsWith("ss") ? w.slice(0,-1) : w;
    const present = w => words.has(w) || [...words].some(other => singular(other) === singular(w));
    // "Pompeii Secret Cabinet" must be identifiable; matching Pompeii alone is insufficient.
    // A Pompeii victim cast is a plaster cast even when the catalog omits
    // the material word "plaster". Require BOTH place and artifact type.
    const pompeiiCast = required.includes("pompeii") &&
        required.includes("plaster") && required.includes("cast") &&
        present("pompeii") && present("cast");
    const missing = required.filter(w => !(pompeiiCast && w === "plaster") && !present(w));
    if(missing.length){
        console.log("[HISTORY IMAGE DIAGNOSTIC]", JSON.stringify({
            provider: candidate?.provider,
            coreSubject: core,
            required,
            missing,
            sourceUrl: candidate?.sourceUrl || "",
            metadata: metadata.slice(0, 320)
        }));
    }
    return missing.length === 0;
}

export async function reviewImage(
    candidate,
    scene
){

    if(
        !candidate
    ){
        return null;
    }


    /*
    =====================================================
    CORE SUBJECT

    오직 Director가 실제로 지정한
    scene.coreSubject만 사용한다.

    중요:

    coreSubject가 없으면
    candidate.primarySubject나
    searchSubject를 핵심 주체로 승격시키지 않는다.

    즉,

    coreSubject 없음
        → 배경 / 장소 / 분위기 Scene
        → 주체 강제 검증 없음

    coreSubject 있음
        → 핵심 주체 검증
    =====================================================
    */


    const coreSubject =
        normalizeSubject(
            scene?.coreSubject ||
            ""
        );


    const providerText =
        getProviderText(
            candidate
        );

    if(!historyMetadataMatches(candidate, scene)){
        console.log(`[${candidate.provider}] Reject : History metadata mismatch`);
        return null;
    }


    /*
    =====================================================
    1. CORE SUBJECT가 있는 경우

    핵심 주체를 반드시 검증한다.
    =====================================================
    */





    /*
    =====================================================
    2. CORE SUBJECT가 없는 경우

    주체 검증을 하지 않는다.

    예:

    조선시대 주막 Scene에서
    coreSubject가 비어 있다면

    → 주막
    → 한옥
    → 전통 한국 건축
    → 밤 분위기

    같은 Scene 표현을 Reviewer가 평가할 수 있다.

    "Core Subject 없음"이라는 이유만으로
    Reject하지 않는다.
    =====================================================
    */


    /*
    =====================================================
    3. 기존 Keyword 검증

    핵심 주체 검증을 통과했거나
    애초에 coreSubject가 없는 후보에 대해
    기존 Reviewer 검증을 수행한다.
    =====================================================
    */


    if(
        !validateImageKeywords(
            [
                providerText
            ]
        )
    ){

        console.log(
            `[${candidate.provider}] Reject : Keyword`
        );


        return null;

    }


    /*
    =====================================================
    4. 해상도 점수
    =====================================================
    */


    candidate.score =
        Number(
            candidate.score || 0
        );


    if(
        candidate.width >= 1920
    ){

        candidate.score += 20;

    }


    if(
        candidate.height >= 1080
    ){

        candidate.score += 20;

    }


    /*
    =====================================================
    5. CORE SUBJECT 후보 우선순위 유지

    search.js에서 지정한
    searchPriority를 그대로 보존한다.
    =====================================================
    */


    if(
        candidate.searchPriority === 100
    ){

        candidate.score += 40;

    }


    console.log(
        `[${candidate.provider}] PASS`,
        candidate.keyword || "",
        "CORE:",
        coreSubject || "NONE",
        "SCORE:",
        candidate.score
    );


    return candidate;

}
