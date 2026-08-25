import { scoreCandidate } from "./search.js";
import {
    searchPixabayVideo
} from "../providers/pixabayVideoProvider.js";

import {
    searchPexelsVideo
} from "../providers/pexelsVideoProvider.js";
import { reviewImage } from "../ai/reviewerAI.js";


function normalizeSubject(text = ""){

    return String(text || "")
        .split(",")[0]
        .replace(/\brealistic\b/ig, "")
        .replace(/\bdocumentary photography\b/ig, "")
        .replace(/\bdocumentary\b/ig, "")
        .replace(/\bwide shot\b/ig, "")
        .replace(/\bclose up\b/ig, "")
        .replace(/\bcloseup\b/ig, "")
        .replace(/\bhighly detailed\b/ig, "")
        .replace(/\bnatural behavior\b/ig, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

}

function subjectMatches(
    candidate,
    subject
){
    if(!candidate?.url){
        return false;
    }

    const coreSubject =
        normalizeSubject(
            subject
        );

    if(!coreSubject){
        return true;
    }

    const metadata =
        String(
            [
                candidate?.tags,
                candidate?.keyword
            ]
                .filter(Boolean)
                .join(" ")
        )
        .toLowerCase();

    /*
    =====================================================
    CORE SUBJECT가 있는 경우

    검색 결과 metadata가 있으면
    핵심 주제와 관련성이 있는지 확인한다.

    단,
    Pexels처럼 tags가 비어 있는 결과를
    무조건 버리지는 않는다.

    실제 검색어 자체가 coreSubject였던 경우에는
    Provider 검색 결과를 신뢰한다.
    =====================================================
    */

    if(!metadata){
        return true;
    }

    const words =
        coreSubject
            .split(/\s+/)
            .filter(
                word =>
                    word.length > 2
            );

    if(!words.length){
        return true;
    }

    let matchedWords = 0;

    for(
        const word of words
    ){
        if(
            metadata.includes(word)
        ){
            matchedWords++;
        }
    }

    /*
    짧은 핵심 주제:
        pygmy squirrel
        traditional tavern

    → 최소 하나

    긴 핵심 주제:
        joseon traditional korean tavern

    → 절반 이상
    */

    const requiredMatches =
        words.length <= 2
            ? 1
            : Math.ceil(
                words.length * 0.5
            );

    return (
        matchedWords >=
        requiredMatches
    );
}


export async function searchVideo(
    keyword,
    scene = {},
    excludedUrls = new Set()
){

    if(!keyword){
        return null;
    }


    /*
    =====================================================
    핵심 주제

    검색어가 아니라 Director가 정한
    실제 핵심 주제를 기준으로 검증한다.

    예:
        keyword:
        pygmy squirrel chewing tree bark in forest

        core subject:
        pygmy squirrel
    =====================================================
    */

const primarySubject =
    normalizeSubject(
        scene?.coreSubject ||
        ""
    );



    const providers = [

        {
            name:"Pixabay Video",
            search:searchPixabayVideo
        },

        {
            name:"Pexels Video",
            search:searchPexelsVideo
        }

    ];


const queries = [
    primarySubject,
    keyword,
    scene?.searchSubject,
    scene?.searchName,
    scene?.imageQueries?.[0]
]
        .map(
            value =>
                String(
                    value || ""
                ).trim()
        )
        .filter(Boolean);


    const uniqueQueries = [

        ...new Set(
            queries
        )

    ];


    const candidates = [];

    /*
    =====================================================
    SEARCH PRIORITY

    1. coreSubject
    2. keyword / searchSubject / searchName
    3. imageQueries

    coreSubject가 있으면 반드시 첫 번째 검색 대상이다.

    단, coreSubject 검색 결과가 없다고 해서
    즉시 실패하지 않는다.
    Scene 전체를 표현할 수 있는 검색으로 확장한다.
    =====================================================
    */

    const primaryQueries =
        primarySubject
            ? [primarySubject]
            : [];

    const fallbackQueries = [
        keyword,
        scene?.searchSubject,
        scene?.searchName,
        scene?.imageQueries?.[0]
    ]
        .map(
            value =>
                String(
                    value || ""
                ).trim()
        )
        .filter(Boolean);

    const uniquePrimaryQueries = [
        ...new Set(
            primaryQueries
        )
    ];

    const uniqueFallbackQueries = [
        ...new Set(
            fallbackQueries
        )
    ];

    /*
    =====================================================
    PHASE 1
    CORE SUBJECT SEARCH

    coreSubject가 있으면
    먼저 이 검색만 수행한다.
    =====================================================
    */

    for(
        const query of uniquePrimaryQueries
    ){

        for(
            const provider of providers
        ){

            try{

                const result =
                    await provider.search(
                        query
                    );

                if(
                    !Array.isArray(result) ||
                    !result.length
                ){
                    continue;
                }

                for(
                    const candidate of result
                ){

                    if(
                        !candidate?.url
                    ){
                        continue;
                    }

                    if(
                        !subjectMatches(
                            candidate,
                            primarySubject
                        )
                    ){
                        continue;
                    }

                    candidate.provider =
                        provider.name;

                    candidate.keyword =
                        query;

                    candidate.primarySubject =
                        primarySubject;

                    candidate.searchPriority =
                        100;

                    candidate.mediaType =
                        "video";

                    candidates.push(
                        candidate
                    );
                }

            }
            catch{
                continue;
            }
        }
    }

    /*
    =====================================================
    CORE SUBJECT 결과가 있으면
    이것을 우선 사용한다.

    예:

    coreSubject = pygmy squirrel

    → squirrel 검색 결과가 있으면
      전혀 관계없는 forest / animal 영상으로
      넘어가지 않는다.

    coreSubject = traditional Korean tavern

    → 주막/전통 음식점/한옥 관련 결과를
      먼저 사용한다.
    =====================================================
    */

    if(
        candidates.length === 0
    ){

        /*
        =================================================
        PHASE 2
        BROAD / SCENE SEARCH

        coreSubject 검색 결과가 없을 때만
        Scene 전체를 표현하기 위한 검색으로 확장한다.
        =================================================
        */

        for(
            const query of uniqueFallbackQueries
        ){

            for(
                const provider of providers
            ){

                try{

                    const result =
                        await provider.search(
                            query
                        );

                    if(
                        !Array.isArray(result) ||
                        !result.length
                    ){
                        continue;
                    }

                    for(
                        const candidate of result
                    ){

                        if(
                            !candidate?.url
                        ){
                            continue;
                        }

                        candidate.provider =
                            provider.name;

                        candidate.keyword =
                            query;

                        candidate.primarySubject =
                            primarySubject;

                        candidate.searchPriority =
                            50;

                        candidate.mediaType =
                            "video";

                        candidates.push(
                            candidate
                        );
                    }

                }
                catch{
                    continue;
                }
            }
        }
    }

    /*
    =====================================================
    후보가 하나도 없으면
    video.js가 기존 이미지 기반 영상으로 fallback.
    =====================================================
    */

    if(
        candidates.length === 0
    ){

        return null;

    }


    /*
    =====================================================
    URL 중복 제거
    =====================================================
    */

    const uniqueCandidates = [];

    const usedUrls =
        new Set();


    for(
        const candidate of candidates
    ){

        if(
            excludedUrls.has(
                candidate?.url
            )
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


        uniqueCandidates.push(
            candidate
        );

    }


    /*
    =====================================================
    최고 점수 영상
    =====================================================
    */

    const reviewed = [];

    for(
        const candidate of uniqueCandidates
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

        result.mediaType =
            "video";

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
                candidate.keyword
            );

        reviewed.push(
            result
        );
    }

    if(
        reviewed.length === 0
    ){
        return null;
    }
    return reviewed;

}
