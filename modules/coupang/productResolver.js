
/*
=========================================================
ShortsAI
Coupang Product Resolver
=========================================================

partnerUrl
    ↓
Deeplink Redirect
    ↓
redirectWebUrl
    ↓
Coupang MLP
    ↓
Next.js Stream
    ↓
mlsdp_main_product
    ↓
data.mainProduct
    ↓
실제 원상품 정보

원칙
---------------------------------------------------------
- partnerUrl 변경 금지
- /vp/products 직접 크롤링 금지
- MLP mainProduct 우선 사용
- 추천상품을 원상품으로 오인하지 않음
- AI 호출 없음
- DB 수정 없음
=========================================================
*/


const DEFAULT_HEADERS = {

    "User-Agent":
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36",

    "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",

    "Accept-Language":
        "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"

};


/*
=========================================================
JS STRING ESCAPE
=========================================================
*/

function decodeJsString(value){

    return String(value || "")
        .replace(
            /\\x([0-9a-fA-F]{2})/g,
            (_, hex) =>
                String.fromCharCode(
                    parseInt(hex, 16)
                )
        )
        .replace(
            /\\u([0-9a-fA-F]{4})/g,
            (_, hex) =>
                String.fromCharCode(
                    parseInt(hex, 16)
                )
        )
        .replace(
            /\\\//g,
            "/"
        );

}


/*
=========================================================
PARTNER REDIRECT URL
=========================================================
*/

function extractRedirectWebUrl(html){

    const source =
        String(html || "");

    const match =
        source.match(
            /redirectWebUrl='([^']+)'/
        );

    if(!match){
        return "";
    }

    return decodeJsString(
        match[1]
    );

}


/*
=========================================================
PRODUCT / ITEM ID
=========================================================
*/

function extractIdentifiers(
    redirectWebUrl,
    partnerHtml = ""
){

    let productId = "";
    let itemId = "";

    if(redirectWebUrl){

        try{

            const parsed =
                new URL(
                    redirectWebUrl
                );

            productId =
                parsed.searchParams.get(
                    "productId"
                ) || "";

            itemId =
                parsed.searchParams.get(
                    "itemId"
                ) || "";

        }
        catch{
            // fallback
        }

    }


    const source =
        String(partnerHtml || "");


    if(!productId){

        const match =
            source.match(
                /productId\\x3D(\d+)/
            ) ||
            source.match(
                /productId%3D(\d+)/i
            ) ||
            source.match(
                /productId=(\d+)/i
            );

        if(match){
            productId = match[1];
        }

    }


    if(!itemId){

        const match =
            source.match(
                /itemId\\x3D(\d+)/
            ) ||
            source.match(
                /itemId%3D(\d+)/i
            ) ||
            source.match(
                /itemId=(\d+)/i
            );

        if(match){
            itemId = match[1];
        }

    }


    return {

        productId:
            String(productId || ""),

        itemId:
            String(itemId || "")

    };

}


/*
=========================================================
NEXT.JS HTML → 검색 가능한 JSON형 문자열

HTML 내부에는 다음처럼 존재할 수 있다.

\"mainProduct\"
\u0026
\u003c

따라서 escape를 단계적으로 복원한다.
=========================================================
*/

function normalizeNextSource(html){

    return String(html || "")

        .replace(
            /\\u0026/gi,
            "&"
        )

        .replace(
            /\\u003d/gi,
            "="
        )

        .replace(
            /\\u003c/gi,
            "<"
        )

        .replace(
            /\\u003e/gi,
            ">"
        )

        .replace(
            /\\u002f/gi,
            "/"
        )

        .replace(
            /\\\//g,
            "/"
        )

        .replace(
            /\\"/g,
            '"'
        );

}


/*
=========================================================
BALANCED OBJECT EXTRACTOR

특정 key 뒤의 { ... } 전체를
중첩 깊이를 계산하여 정확하게 추출한다.

정규식으로 중첩 JSON을 자르지 않는다.
=========================================================
*/

function extractBalancedObject(
    source,
    objectStart
){

    if(
        !source ||
        objectStart < 0 ||
        source[objectStart] !== "{"
    ){
        return "";
    }


    let depth = 0;

    let inString = false;

    let escaped = false;


    for(
        let i = objectStart;
        i < source.length;
        i++
    ){

        const char =
            source[i];


        if(inString){

            if(escaped){

                escaped = false;

                continue;

            }


            if(char === "\\"){

                escaped = true;

                continue;

            }


            if(char === '"'){

                inString = false;

            }


            continue;

        }


        if(char === '"'){

            inString = true;

            continue;

        }


        if(char === "{"){

            depth++;

            continue;

        }


        if(char === "}"){

            depth--;


            if(depth === 0){

                return source.slice(
                    objectStart,
                    i + 1
                );

            }

        }

    }


    return "";

}


/*
=========================================================
KEY 뒤 OBJECT 추출
=========================================================
*/

function extractObjectByKey(
    source,
    key,
    startAt = 0
){

    const token =
        `"${key}"`;


    const keyIndex =
        source.indexOf(
            token,
            startAt
        );


    if(keyIndex === -1){

        return {

            text: "",
            keyIndex: -1,
            objectStart: -1

        };

    }


    const colonIndex =
        source.indexOf(
            ":",
            keyIndex + token.length
        );


    if(colonIndex === -1){

        return {

            text: "",
            keyIndex,
            objectStart: -1

        };

    }


    let objectStart =
        colonIndex + 1;


    while(
        objectStart < source.length &&
        /\s/.test(
            source[objectStart]
        )
    ){

        objectStart++;

    }


    if(
        source[objectStart] !== "{"
    ){

        return {

            text: "",
            keyIndex,
            objectStart: -1

        };

    }


    return {

        text:
            extractBalancedObject(
                source,
                objectStart
            ),

        keyIndex,

        objectStart

    };

}


/*
=========================================================
JSON PARSE
=========================================================
*/

function safeJsonParse(value){

    if(!value){
        return null;
    }


    try{

        return JSON.parse(
            value
        );

    }
    catch{

        return null;

    }

}



/*
=========================================================
TARGET PRODUCT OBJECT FALLBACK

현재 MLP 응답은 mainProduct가 항상 존재한다고 보장할 수 없다.
따라서 요청 productId / itemId를 anchor로 사용하여
Next.js/MLP JSON 객체 중 동일 상품 후보를 찾는다.

주의:
- 추천상품 오인을 막기 위해 productId + itemId를 모두 검증한다.
- 단순 __SERVER_DATA__ identity 객체는 상품 상세 데이터로 채택하지 않는다.
- mainProduct 방식은 최우선으로 그대로 유지한다.
=========================================================
*/

function collectBalancedObjectsAroundTarget(
    source,
    target,
    maxObjects = 200
){
    const results = [];
    let position = 0;

    while(position < source.length && results.length < maxObjects){

        const hit = source.indexOf(
            String(target),
            position
        );

        if(hit === -1){
            break;
        }

        /*
        target 주변에서 가능한 모든 상위 JSON object 시작점을
        제한된 범위 안에서 역방향 탐색한다.
        */
        const min =
            Math.max(
                0,
                hit - 30000
            );

        for(
            let start = hit;
            start >= min;
            start--
        ){
            if(source[start] !== "{"){
                continue;
            }

            const objectText =
                extractBalancedObject(
                    source,
                    start
                );

            if(
                !objectText ||
                start + objectText.length <= hit
            ){
                continue;
            }

            if(
                !objectText.includes(
                    String(target)
                )
            ){
                continue;
            }

            results.push({
                start,
                text: objectText
            });

            if(results.length >= maxObjects){
                break;
            }
        }

        position =
            hit +
            String(target).length;
    }

    /*
    작은 객체부터 검사하면 identity 객체를 먼저 볼 수 있으므로
    상세 필드가 들어 있을 가능성이 높은 큰 객체도 함께 평가한다.
    중복 제거 후 길이 오름차순 유지.
    */
    const unique = new Map();

    for(const item of results){
        const key =
            `${item.start}:${item.text.length}`;

        if(!unique.has(key)){
            unique.set(key, item);
        }
    }

    return [...unique.values()];
}


function deepFindMatchingProductObjects(
    value,
    productId,
    itemId,
    results = [],
    seen = new Set()
){
    if(
        !value ||
        typeof value !== "object" ||
        seen.has(value)
    ){
        return results;
    }

    seen.add(value);

    if(!Array.isArray(value)){

        const candidateProductId =
            String(
                value?.productId ??
                ""
            );

        const candidateItemId =
            String(
                value?.itemId ??
                ""
            );

        if(
            candidateProductId === String(productId) &&
            (
                !itemId ||
                candidateItemId === String(itemId)
            )
        ){
            results.push(value);
        }
    }

    for(const child of Object.values(value)){

        if(
            child &&
            typeof child === "object"
        ){
            deepFindMatchingProductObjects(
                child,
                productId,
                itemId,
                results,
                seen
            );
        }
    }

    return results;
}


function productCandidateScore(
    candidate
){
    if(
        !candidate ||
        typeof candidate !== "object"
    ){
        return -1;
    }

    let score = 0;

    const serialized =
        JSON.stringify(candidate);

    const directKeys = [
        "productTitle",
        "productName",
        "title",
        "name",
        "finalPrice",
        "salePrice",
        "price",
        "originalPrice",
        "discountRate",
        "reviewRating",
        "rating",
        "reviewCount",
        "numberOfReviews",
        "productImageUrl",
        "imageUrl",
        "attrOptions",
        "attributes",
        "pdd",
        "delivery",
        "starBrandInfo",
        "brandName",
        "stockRemainingInfo"
    ];

    for(const key of directKeys){
        if(
            candidate[key] !== undefined &&
            candidate[key] !== null &&
            candidate[key] !== ""
        ){
            score += 10;
        }
    }

    const detailMarkers = [
        "productTitle",
        "finalPrice",
        "salePrice",
        "originalPrice",
        "reviewRating",
        "productImageUrl",
        "attrOptions",
        "stockRemainingInfo"
    ];

    for(const marker of detailMarkers){
        if(serialized.includes(`"${marker}"`)){
            score += 3;
        }
    }

    /*
    로그/추적 객체는 productId/itemId를 갖더라도 상품 상세가 아니다.
    */
    const logKeys = [
        "logType",
        "eventName",
        "logCategory",
        "landingUrl",
        "pageName"
    ];

    let logHits = 0;

    for(const key of logKeys){
        if(candidate[key] !== undefined){
            logHits++;
        }
    }

    if(logHits >= 3){
        score -= 40;
    }

    /*
    __SERVER_DATA__ 형태:
    identity 검증에는 유효하지만 상세 상품 객체로는 부족하다.
    */
    const keys =
        Object.keys(candidate);

    const identityOnly =
        keys.length <= 10 &&
        candidate.productId !== undefined &&
        candidate.itemId !== undefined &&
        !candidate.productTitle &&
        !candidate.finalPrice &&
        !candidate.salePrice &&
        !candidate.price &&
        !candidate.productImageUrl &&
        !candidate.reviewRating;

    if(identityOnly){
        score -= 25;
    }

    return score;
}


function findTargetProductObject(
    html,
    productId,
    itemId
){
    const source =
        normalizeNextSource(
            html
        );

    const wrappers =
        collectBalancedObjectsAroundTarget(
            source,
            productId
        );

    const candidates = [];

    for(const wrapper of wrappers){

        const parsed =
            safeJsonParse(
                wrapper.text
            );

        if(!parsed){
            continue;
        }

        deepFindMatchingProductObjects(
            parsed,
            productId,
            itemId,
            candidates
        );
    }

    /*
    후보 중 상세 필드가 가장 풍부한 객체를 선택한다.
    productId/itemId exact match는 deepFind 단계에서 이미 강제된다.
    */
    let best = null;
    let bestScore = -Infinity;

    for(const candidate of candidates){

        const score =
            productCandidateScore(
                candidate
            );

        if(score > bestScore){
            best = candidate;
            bestScore = score;
        }
    }

    /*
    0 이하이면 identity/log 객체일 가능성이 높으므로
    실제 상품 상세 객체로 인정하지 않는다.
    */
    if(!best || bestScore <= 0){

        return {
            product: null,
            sourceType: "target_object_not_found",
            exact: false,
            score:
                Number.isFinite(bestScore)
                    ? bestScore
                    : null
        };
    }

    return {
        product: best,
        sourceType: "target_object",
        exact: true,
        score: bestScore
    };
}


function firstNonEmpty(
    ...values
){
    for(const value of values){

        if(
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ){
            return value;
        }
    }

    return "";
}


function findDeepValueByKeys(
    root,
    keys,
    maxDepth = 8
){
    const wanted =
        new Set(keys);

    const seen =
        new Set();

    function walk(
        value,
        depth
    ){
        if(
            !value ||
            typeof value !== "object" ||
            depth > maxDepth ||
            seen.has(value)
        ){
            return undefined;
        }

        seen.add(value);

        if(!Array.isArray(value)){

            for(const key of keys){

                if(
                    Object.prototype.hasOwnProperty.call(
                        value,
                        key
                    )
                ){
                    const found =
                        value[key];

                    if(
                        found !== undefined &&
                        found !== null &&
                        found !== ""
                    ){
                        return found;
                    }
                }
            }
        }

        for(const child of Object.values(value)){

            if(
                child &&
                typeof child === "object"
            ){
                const found =
                    walk(
                        child,
                        depth + 1
                    );

                if(found !== undefined){
                    return found;
                }
            }
        }

        return undefined;
    }

    return walk(
        root,
        0
    );
}


function normalizeResolvedMain(
    main
){
    if(
        !main ||
        typeof main !== "object"
    ){
        return {};
    }

    /*
    기존 mainProduct 구조를 우선하고,
    새 구조에서 발견되는 일반적인 동의 필드만 fallback으로 사용한다.
    확인되지 않은 값을 생성하지 않는다.
    */

    const normalized = {
        ...main
    };

    if(!normalized.productTitle){

        normalized.productTitle =
            String(
                firstNonEmpty(
                    main.productName,
                    main.title,
                    main.name,
                    findDeepValueByKeys(
                        main,
                        [
                            "productTitle",
                            "productName"
                        ]
                    )
                ) || ""
            ).trim();
    }

    if(!normalized.productImageUrl){

        const image =
            firstNonEmpty(
                main.imageUrl,
                main.image,
                findDeepValueByKeys(
                    main,
                    [
                        "productImageUrl",
                        "imageUrl"
                    ]
                )
            );

        if(typeof image === "string"){
            normalized.productImageUrl =
                image;
        }
    }

    if(!normalized.finalPrice){

        const price =
            firstNonEmpty(
                main.salePrice,
                main.price,
                findDeepValueByKeys(
                    main,
                    [
                        "salePrice",
                        "price"
                    ]
                )
            );

        if(
            price !== "" &&
            price !== undefined
        ){
            normalized.finalPrice = {
                value:
                    typeof price === "object"
                        ? firstNonEmpty(
                            price.value,
                            price.amount,
                            price.price
                        )
                        : price
            };
        }
    }

    if(!normalized.originalPrice){

        normalized.originalPrice =
            firstNonEmpty(
                main.listPrice,
                main.basePrice,
                findDeepValueByKeys(
                    main,
                    [
                        "originalPrice",
                        "listPrice",
                        "basePrice"
                    ]
                )
            );
    }

    if(!normalized.reviewRating){

        const rating =
            firstNonEmpty(
                main.rating,
                main.reviewScore,
                findDeepValueByKeys(
                    main,
                    [
                        "rating",
                        "reviewScore"
                    ]
                )
            );

        const count =
            firstNonEmpty(
                main.reviewCount,
                main.numberOfReviews,
                findDeepValueByKeys(
                    main,
                    [
                        "reviewCount",
                        "numberOfReviews"
                    ]
                )
            );

        if(
            rating !== "" ||
            count !== ""
        ){
            normalized.reviewRating = {
                value:
                    typeof rating === "object"
                        ? firstNonEmpty(
                            rating.value,
                            rating.score
                        )
                        : rating,

                text:
                    count !== ""
                        ? `(${count})`
                        : ""
            };
        }
    }

    return normalized;
}


/*
=========================================================
mainProduct 후보 검증

MLP에는 같은 단어가 여러 번 나타날 가능성이 있으므로
productId / itemId가 실제 요청 상품과 맞는 후보를 선택한다.
=========================================================
*/

function findMainProduct(
    html,
    productId,
    itemId
){

    const source =
        normalizeNextSource(
            html
        );


    let position = 0;

    let fallback = null;


    while(
        position < source.length
    ){

        const found =
            extractObjectByKey(
                source,
                "mainProduct",
                position
            );


        if(
            found.keyIndex === -1
        ){

            break;

        }


        position =
            found.keyIndex +
            '"mainProduct"'.length;


        if(!found.text){

            continue;

        }


        const parsed =
            safeJsonParse(
                found.text
            );


        if(!parsed){

            continue;

        }


        if(!fallback){

            fallback = parsed;

        }


        const candidateProductId =
            String(
                parsed?.productId ??
                ""
            );


        const candidateItemId =
            String(
                parsed?.itemId ??
                ""
            );


        const productMatch =
            !productId ||
            candidateProductId ===
                String(productId);


        const itemMatch =
            !itemId ||
            candidateItemId ===
                String(itemId);


        if(
            productMatch &&
            itemMatch
        ){

            return {

                product:
                    parsed,

                sourceType:
                    "mainProduct",

                exact:
                    true

            };

        }

    }


    /*
    -----------------------------------------------------
    fallback는 ID까지 검증한 경우에만 허용하는 것이
    안전하지만, productId/itemId가 없는 비정상 상황은
    상위 단계에서 이미 차단한다.

    따라서 여기서는 잘못된 추천상품 반환을 막기 위해
    fallback을 실제 결과로 사용하지 않는다.
    -----------------------------------------------------
    */


    return {

        product: null,

        sourceType:
            fallback
                ? "mainProduct_mismatch"
                : "mainProduct_not_found",

        exact:
            false

    };

}


/*
=========================================================
보조 숫자 탐색

실제 리뷰 수는 mainProduct 밖의 social proof schema에
존재할 수 있다.

반드시 같은 productId/itemId 주변에서만 찾는다.
=========================================================
*/

function extractActualReviewCount(
    html,
    productId,
    itemId
){

    const source =
        normalizeNextSource(
            html
        );


    const patterns = [

        /"numberOfReviews"\s*:\s*(\d+)/g,

        /"reviewCount"\s*:\s*(\d+)/g

    ];


    for(
        const pattern of patterns
    ){

        let match;


        while(
            (
                match =
                    pattern.exec(
                        source
                    )
            )
        ){

            const start =
                Math.max(
                    0,
                    match.index - 5000
                );


            const end =
                Math.min(
                    source.length,
                    match.index + 5000
                );


            const region =
                source.slice(
                    start,
                    end
                );


            const productMatch =
                !productId ||
                region.includes(
                    `"productId":${productId}`
                );


            const itemMatch =
                !itemId ||
                region.includes(
                    `"itemId":${itemId}`
                );


            if(
                productMatch &&
                itemMatch
            ){

                const value =
                    Number(
                        match[1]
                    );


                if(
                    Number.isFinite(value)
                ){

                    return value;

                }

            }

        }

    }


    return null;

}


/*
=========================================================
ROCKET DELIVERY
=========================================================
*/

function detectRocketDelivery(
    mainProduct
){

    const badge =
        String(
            mainProduct?.deliveryBadgeUrl ||
            ""
        );


    const label =
        String(
            mainProduct?.extraInfo?.labelId ||
            ""
        );


    const serialized =
        JSON.stringify(
            mainProduct || {}
        );


    return (
        /rocket/i.test(
            badge
        ) ||
        /ROCKER_DELIVERY|ROCKET_DELIVERY/i.test(
            label
        ) ||
        /ROCKER_DELIVERY|ROCKET_DELIVERY/i.test(
            serialized
        )
    );

}


/*
=========================================================
URL NORMALIZE
=========================================================
*/

function normalizeUrl(value){

    let url =
        String(
            value || ""
        ).trim();


    if(
        url.startsWith(
            "http://"
        )
    ){

        url =
            "https://" +
            url.slice(7);

    }


    return url;

}


/*
=========================================================
PARTNER PAGE
=========================================================
*/

async function fetchPartnerPage(
    partnerUrl
){

    const response =
        await fetch(
            partnerUrl,
            {

                redirect:
                    "follow",

                headers:
                    DEFAULT_HEADERS

            }
        );


    if(!response.ok){

        throw new Error(
            `COUPANG PARTNER HTTP ${response.status}`
        );

    }


    return await response.text();

}


/*
=========================================================
MLP PAGE
=========================================================
*/

async function fetchMlpPage(
    redirectWebUrl,
    partnerUrl
){
console.log("[MLP URL]", redirectWebUrl);

    const response =
        await fetch(
            redirectWebUrl,
            {

                redirect:
                    "follow",

                headers: {

                    ...DEFAULT_HEADERS,

                    "Referer":
                        partnerUrl

                }

            }
        );


    if(!response.ok){

        throw new Error(
            `COUPANG MLP HTTP ${response.status}`
        );

    }


    return await response.text();

}


/*
=========================================================
MAIN RESOLVER
=========================================================
*/

export async function resolveCoupangProduct(
    product = {}
){

    const partnerUrl =
        String(
            product?.partnerUrl ||
            ""
        ).trim();


    if(!partnerUrl){

        throw new Error(
            "COUPANG PARTNER URL 없음"
        );

    }


    /*
    =====================================================
    STEP 1
    PARTNER PAGE
    =====================================================
    */

    const partnerHtml =
        await fetchPartnerPage(
            partnerUrl
        );


    /*
    =====================================================
    STEP 2
    REDIRECT WEB URL
    =====================================================
    */

    const redirectWebUrl =
        extractRedirectWebUrl(
            partnerHtml
        );


    if(!redirectWebUrl){

        throw new Error(
            "COUPANG redirectWebUrl 추출 실패"
        );

    }


    /*
    =====================================================
    STEP 3
    IDENTIFIER
    =====================================================
    */

    const identifiers =
        extractIdentifiers(
            redirectWebUrl,
            partnerHtml
        );


    const productId =
        identifiers.productId;


    const itemId =
        identifiers.itemId;


    if(!productId){

        throw new Error(
            "COUPANG productId 추출 실패"
        );

    }

/*
=====================================================
STEP 4
MLP PAGE
=====================================================
*/

const mlpHtml =
    await fetchMlpPage(
        redirectWebUrl,
        partnerUrl
    );


/*
=====================================================
STEP 5
EXACT mainProduct
=====================================================
*/

let mainResult =
    findMainProduct(
        mlpHtml,
        productId,
        itemId
    );


/*
mainProduct가 없는 최신 MLP 구조에서는
동일 productId/itemId를 가진 JSON 객체를 탐색한다.
*/
if(
    !mainResult.product
){

    mainResult =
        findTargetProductObject(
            mlpHtml,
            productId,
            itemId
        );

}


if(
    !mainResult.product
){

    throw new Error(
        `COUPANG 상품 객체 추출 실패 : ${productId}/${itemId} (${mainResult.sourceType})`
    );

}


const main =
    normalizeResolvedMain(
        mainResult.product
    );

    /*
    =====================================================
    STEP 6
    FIELD NORMALIZATION
    =====================================================
    */

    const productTitle =
        String(
            main?.productTitle ||
            ""
        ).trim();


    const resolvedProductId =
        String(
            main?.productId ??
            productId ??
            ""
        );


    const resolvedItemId =
        String(
            main?.itemId ??
            itemId ??
            ""
        );


    const vendorItemId =
        String(
            main?.vendorItemId ??
            ""
        );


    const detailUrl =
        normalizeUrl(
            main?.detailUrl
        );


    const productImageUrl =
        normalizeUrl(
            main?.productImageUrl
        );


    const price =
        String(
            main?.finalPrice?.value ||
            ""
        ).trim();


    const unitPrice =
        String(
            main?.finalPrice?.unitPriceText ||
            ""
        ).trim();


    const originalPrice =
        String(
            main?.originalPrice ||
            ""
        ).trim();


    const discountRate =
        String(
            main?.noDiscountRate?.value ||
            ""
        ).trim();


    const ratingValue =
        Number(
            main?.reviewRating?.value
        );


    const rating =
        Number.isFinite(
            ratingValue
        )
            ? ratingValue
            : null;


    const reviewCount =
        String(
            main?.reviewRating?.text ||
            ""
        )
            .replace(
                /^\(/,
                ""
            )
            .replace(
                /\)$/,
                ""
            )
            .trim();


const actualReviewCount =
    extractActualReviewCount(
        mlpHtml,
        resolvedProductId,
        resolvedItemId
    );

    const attributes =
        Array.isArray(
            main?.attrOptions
        )
            ? main.attrOptions
                .filter(
                    item =>
                        item &&
                        item.type &&
                        item.value
                )
                .map(
                    item => ({
                        type:
                            String(
                                item.type
                            ).trim(),

                        value:
                            String(
                                item.value
                            ).trim()
                    })
                )
            : [];


    const delivery =
        String(
            main?.pdd?.label ||
            ""
        ).trim();


    const rocketDelivery =
        detectRocketDelivery(
            main
        );


    const brandName =
        String(
            main?.starBrandInfo?.brandName ||
            ""
        ).trim();


    const soldOut =
        main?.stockRemainingInfo?.isSoldOut ===
        true;


    /*
    =====================================================
    STEP 7
    STRICT RESOLVE CHECK
    =====================================================
    */

    const idMatched =
        resolvedProductId ===
            String(productId) &&
        (
            !itemId ||
            resolvedItemId ===
                String(itemId)
        );


    const resolved =
        Boolean(
            mainResult.exact &&
            idMatched &&
            productTitle &&
            resolvedProductId &&
            resolvedItemId
        );


    /*
    =====================================================
    STEP 8
    RESULT
    =====================================================
    */

    return {

        /*
        -------------------------------------------------
        저장 데이터
        -------------------------------------------------
        */

        id:
            product?.id ||
            null,

        storedName:
            product?.name ||
            "",

        keyword:
            product?.keyword ||
            product?.name ||
            "",

        partnerUrl,

        images:
            Array.isArray(
                product?.images
            )
                ? product.images
                : [],


        /*
        -------------------------------------------------
        쿠팡 실상품
        -------------------------------------------------
        */

        productTitle,

        productId:
            resolvedProductId,

        itemId:
            resolvedItemId,

        vendorItemId,

        detailUrl,

        price,

        originalPrice,

        discountRate,

        unitPrice,

        rating,

        reviewCount,

        actualReviewCount,

        attributes,

        delivery,

        rocketDelivery,

        productImageUrl,

        brandName,

        soldOut,


        /*
        -------------------------------------------------
        Resolver
        -------------------------------------------------
        */

        redirectWebUrl,

        resolverSource:
            mainResult.sourceType,

        exactMatch:
            mainResult.exact,

        resolved

    };

}


/*
=========================================================
DEFAULT EXPORT
=========================================================
*/

export default {

    resolveCoupangProduct

};
