import { searchCommonsHistory, searchMetHistory, searchAicHistory } from "../providers/historyArchives.js";
import {
    reviewImage
} from "../ai/reviewerAI.js";

import {
    providers
} from "./provider.js";

import {
    debug
} from "../logger.js";


function normalizeSubject(
    text = ""
){

    return String(
        text || ""
    )
        .split(",")[0]
        .replace(
            /\brealistic\b/ig,
            ""
        )
        .replace(
            /\bdocumentary photography\b/ig,
            ""
        )
        .replace(
            /\bdocumentary\b/ig,
            ""
        )
        .replace(
            /\bwide shot\b/ig,
            ""
        )
        .replace(
            /\bclose up\b/ig,
            ""
        )
        .replace(
            /\bcloseup\b/ig,
            ""
        )
        .replace(
            /\bhighly detailed\b/ig,
            ""
        )
        .replace(
            /\bnatural behavior\b/ig,
            ""
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim()
        .toLowerCase();

}


export function scoreCandidate(
    candidate,
    keyword
){
    let score =
        Number(candidate.score || 0);

    /*
    =====================================================
    FINAL MEDIA SCORE

    Reviewer가 판단한 score를 최종 기준으로 사용한다.

    여기서 해상도 / provider / keyword / coreSubject를
    다시 가산하지 않는다.

    Reviewer score를 다시 누적하면
    IMAGE 180 → 268 같은 이중 계산이 발생하고
    IMAGE / VIDEO 비교 자체가 왜곡된다.

    searchPriority는 검색 단계의 우선순위이며
    최종 미디어 선택 점수에 다시 가산하지 않는다.
    =====================================================
    */

    return score;
}

function buildPrimarySearchWords(
    coreSubject
){

    if(
        !coreSubject
    ){
        return [];
    }


    return [
        coreSubject
    ];

}


function buildFallbackSearchWords(
    keyword,
    scene
){

    const list = [];


    if(
        keyword
    ){
        list.push(
            String(
                keyword
            ).trim()
        );
    }


    if(
        scene?.searchSubject
    ){
        list.push(
            scene.searchSubject
        );
    }


    if(
        scene?.searchName
    ){
        list.push(
            scene.searchName
        );
    }


    if(
        scene?.subject
    ){
        list.push(
            scene.subject
        );
    }


    if(
        scene?.imageQueries?.[0]
    ){
        list.push(
            scene.imageQueries[0]
        );
    }


    return [
        ...new Set(
            list
                .map(
                    value =>
                        String(
                            value || ""
                        )
                            .trim()
                )
                .filter(Boolean)
        )
    ];

}


function uniqueCandidates(
    candidates
){

    const result = [];
    const usedUrls = new Set();


    for(
        const candidate of candidates
    ){

        if(
            !candidate?.url
        ){
            continue;
        }


        if(
            usedUrls.has(
                candidate.url
            )
        ){
            continue;
        }


        usedUrls.add(
            candidate.url
        );


        result.push(
            candidate
        );

    }


    return result;

}


async function searchProvider(
    provider,
    searchWord,
    primarySubject,
    searchPriority,
    scene
){

    try{

        const result =
            await provider.search(
                searchWord
            );


        if(
            !result
        ){
            return [];
        }


        const list =
            Array.isArray(
                result
            )
                ? result
                : [result];


        const candidates = [];


        for(
            const candidate of list
        ){

            if(
                !candidate?.url
            ){
                continue;
            }


            candidate.provider =
                provider.name;


            candidate.keyword =
                searchWord;


            candidate.primarySubject =
                primarySubject;


            candidate.searchSubject =
                scene?.searchSubject ||
                "";


            candidate.searchHint =
                scene?.searchHint ||
                "";


            candidate.subject =
                scene?.subject ||
                "";


            candidate.searchPriority =
                searchPriority;


            candidates.push(
                candidate
            );

        }


        return candidates;

    }
    catch(error){

        debug(
            `[${provider.name}] ERROR : ${error?.message || error}`
        );


        return [];

    }

}


export async function searchImage(
    keyword,
    scene = {},
    excludedUrls = new Set()
){

    const primarySubject =
        normalizeSubject(
            scene?.coreSubject ||
            ""
        );


    /*
    =====================================================
    SEARCH PLAN

    CORE SUBJECT가 있으면:

        1. coreSubject
        2. Scene / keyword fallback

    CORE SUBJECT가 없으면:

        1. Scene / keyword 검색

    중요:

    coreSubject를 모든 검색어에 붙이지 않는다.

    coreSubject는 "검색 우선순위"다.
    모든 후보가 coreSubject를 포함해야 한다는
    의미가 아니다.
    =====================================================
    */


    const directorImageQueries =
        (scene?.mediaMode === "image" || scene?.category === "history") &&
        Array.isArray(scene.imageQueries) && scene.imageQueries.length > 0;

    const primaryQueries = directorImageQueries ? [] :
        buildPrimarySearchWords(
            primarySubject
        );


    const fallbackQueries = directorImageQueries ? [keyword] :
        buildFallbackSearchWords(
            keyword,
            scene
        );


    const allCandidates = [];


    /*
    =====================================================
    PHASE 1
    CORE SUBJECT SEARCH

    예:

    coreSubject:
        pygmy squirrel

    → pygmy squirrel 검색

    coreSubject:
        traditional Korean tavern

    → traditional korean tavern 검색

    양반이라는 다른 요소를 강제로 붙이지 않는다.
    =====================================================
    */


    const activeProviders =
        scene?.category === "history"
            ? [
                { name: "WikimediaCommons", search: searchCommonsHistory },
                { name: "MetMuseum", search: searchMetHistory },
                { name: "ArtInstituteChicago", search: searchAicHistory }
            ]
            : scene?.mediaMode === "image"
                ? providers.filter(provider => provider.name !== "Pollinations")
                : providers;

debug(
    `[IMAGE PROVIDERS] MODE=${scene?.mediaMode || "default"} : ${activeProviders.map(p => p.name).join(", ")}`
);

if(
    primaryQueries.length > 0
){

        for(
            const provider of activeProviders
        ){

            for(
                const searchWord of primaryQueries
            ){

                const result =
                    await searchProvider(
                        provider,
                        searchWord,
                        primarySubject,
                        100,
                        scene
                    );


                allCandidates.push(
                    ...result
                );

            }

        }

    }


    /*
    =====================================================
    PHASE 2
    FALLBACK / SCENE SEARCH

    coreSubject 결과가 있더라도
    검색 결과가 너무 부족할 수 있으므로
    Scene을 표현할 수 있는 후보를 추가한다.

    단,
    coreSubject 후보보다 낮은 우선순위를 가진다.
    =====================================================
    */


    for(
        const provider of activeProviders
    ){

        for(
            const searchWord of fallbackQueries
        ){

            /*
            coreSubject 자체와 동일한 검색어는
            중복 검색하지 않는다.
            */

            if(
                !directorImageQueries && primarySubject &&
                normalizeSubject(
                    searchWord
                ) ===
                primarySubject
            ){
                continue;
            }


            const result =
                await searchProvider(
                    provider,
                    searchWord,
                    primarySubject,
                    50,
                    scene
                );


            allCandidates.push(
                ...result
            );

        }

    }


    if(
        allCandidates.length === 0
    ){

        debug(
            `[IMAGE] 후보 없음 : ${keyword}`
        );


        return null;

    }


    /*
    =====================================================
    URL DUPLICATE REMOVE
    =====================================================
    */


    const unique =
        uniqueCandidates(
            allCandidates
        );

const available =
    unique.filter(
        candidate =>
            !excludedUrls.has(
                candidate.url
            )
    );

    /*
    =====================================================
    FIRST SCORE

    CoreSubject 후보가 먼저 평가되도록
    searchPriority를 반영한다.

    Reviewer는 여전히 실제 이미지 적합성을
    최종 판단한다.
    =====================================================
    */


available.sort(
        (a, b) =>
            scoreCandidate(
                b,
                keyword
            ) -
            scoreCandidate(
                a,
                keyword
            )
    );


    /*
    =====================================================
    REVIEWER

    기존 Reviewer 구조 유지.

    검색 우선순위만 바뀌고
    실제 이미지 적합성 판단은 Reviewer가 한다.
    =====================================================
    */


    const reviewed = [];

for(
    const candidate of available
){

        const result =
            await reviewImage(
                candidate,
                scene
            );


        if(
            !result
        ){
            continue;
        }


        result.searchPriority =
            candidate.searchPriority;


        result.primarySubject =
            candidate.primarySubject;


        result.keyword =
            candidate.keyword;


        result.provider =
            candidate.provider;


        result.score =
            scoreCandidate(
                result,
                keyword
            );


        reviewed.push(
            result
        );

    }


    if(
        reviewed.length === 0
    ){

        debug(
            `[IMAGE] Reviewer PASS 없음 : ${keyword}`
        );


        return null;

    }


    /*
    =====================================================
    FINAL SCORE

    CoreSubject 검색 후보가
    Scene fallback 후보보다 우선.

    단, Reviewer가 완전히 부적합하다고 판단한
    후보는 여기까지 오지 않는다.
    =====================================================
    */


    return reviewed;


}
