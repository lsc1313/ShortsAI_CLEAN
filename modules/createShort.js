import { updateShopPage } from "./hotdeal/shopUpdater.js";


function formatTTSVoice(text) {
    if (!text) return "";
    return String(text)
        .replace(/(\d+),(\d+)/g, "$1$2")         // 쉼표 제거 (18,000 -> 18000)
        .replace(/(\d+)\.(\d+)/g, "$1점 $2");    // 소수점 띄어쓰기 교정 (0.6 -> 0점 6)
}

function formatSubtitle(text) {
    if (!text) return "";
    return String(text); // 자막은 원본 표기법 유지
}




import fs from "fs";
import { createImage } from "./image.js";
import { createTTS } from "./tts.js";
import { createSubtitle } from "./subtitle.js";
import { createVideo } from "./video.js";
import { createThumbnail } from "./thumbnail.js";
import { createMetadata } from "./metadata.js";
import { uploadVideo } from "./upload.js";
import { uploadInstagramReel } from "./instagram/instagramUploader.js";
import { createThreadsDirector } from "./threads/director.js";
import { uploadThreadsText } from "./threads/uploader.js";
import { createShoppingDirector } from "./shopping/director.js";
import { createHotdealDirector } from "./hotdeal/director.js";
import { createHotdealCards } from "./hotdeal/card.js";
import { createHistoryDirector } from "./history/director.js";
import { validateHistoryProduction } from "./history/qualityGate.js";
import { createAnimalDirector } from "./animal/director.js";
import { createAIDirector } from "./ai/director.js";
import { createScienceDirector } from "./science/director.js";
import { enqueueShort } from "./queue.js";
import {
    cleanBeforeJob,
    cleanAfterUpload
} from "./cleanup.js";

import {
    section,
    success,
    debug,
    step
} from "./logger.js";


export async function createShort(
    topic,
    channel = null,
    options = {}
){

try{

    if(channel){

        console.log("");

        console.log(
            "===================="
        );

        console.log(
            `[CHANNEL] ${channel.name}`
        );

        console.log(
            "===================="
        );

    }

section("SHORTS");

success(
    `주제 : ${topic}`
);

if(channel){

    success(
        `채널 : ${channel.name}`
    );

}

/*
1 AI 분석
*/

const product =
    options?.product || null;

step("DIRECTOR");

let director;
        let hotdealCards = [];
let hotdealProducts = [];

const channelName =
    String(channel?.name || "")
        .trim()
        .toLowerCase();

if (channelName === "shopping") {

    /*
     * SHOPPING 채널
     *
     * 일반 쇼핑
     *   → 기존 Shopping Director
     *
     * HOTDEAL
     *   → 상품정보
     *   → HOTDEAL Director
     *
     * 채널 자체는 기존 SHOPPING을 그대로 사용한다.
     */

    if (
        options?.hotdeal === true
    ) {

        hotdealProducts =
            Array.isArray(options?.products)
                ? options.products
                : [];

        if (
            hotdealProducts.length === 0
        ) {
            throw new Error(
                "HOTDEAL: 상품 데이터가 없습니다."
            );
        }

        /*
         * HOTDEAL FLOW
         *
         * 상품정보
         *   ↓
         * 세로형 상품카드 생성
         *   ↓
         * 카드에 사용된 상품정보를 텍스트로 Director에 전달
         *   ↓
         * HOTDEAL Director가 영상 연출 결정
         *
         * Director에는 카드 이미지 자체를 전달하지 않는다.
         * 카드에 들어간 상품정보만 전달한다.
         */

        hotdealCards = await createHotdealCards(hotdealProducts);

        /*
         * 카드 생성 결과를 Director 입력으로 사용한다.
         *
         * cardFile은 AI에게 전달하지 않는다.
         * 상품정보 필드만 전달한다.
         */
        const directorProducts =
            hotdealCards.map(card => ({
                order: card.order,
                productGroup: card.productGroup,
                name: card.name,
                price: card.price,
                unitPrice: card.unitPrice,
                unitLabel: card.unitLabel,
                highestPrice: card.highestPrice,
                dealRate: card.dealRate,
                isHotdeal: card.isHotdeal,
                sevenDayLow: card.sevenDayLow,
                sevenDayStatus: card.sevenDayStatus,
                thirtyDayLow: card.thirtyDayLow,
                thirtyDayStatus: card.thirtyDayStatus,
                image: card.image,
                url: card.url
            }));

        director =
            await createHotdealDirector(
                directorProducts,
                hotdealCards
            );

        /*
         * HOTDEAL Director의 상품별 연출을
         * 기존 TTS / SUBTITLE / VIDEO가 사용하는
         * scenes 구조로 변환한다.
         *
         * 실제 화면은 이미 생성된 HOTDEAL CARD를 사용한다.
         */

        const hotdealScenes = [];

        hotdealScenes.push({
            type: "hook",
            sceneType: "hook",
            script: director.hook?.tts || "",
            voice: formatTTSVoice(director.hook?.tts || ""),
            subtitle: director.hook?.subtitle || "",
            tts: director.hook?.tts || ""
        });

        for (
            const item of director.products
        ) {

            hotdealScenes.push({
                type: "global",
                sceneType: "global",

                product:
                    item,

                script:
                    item.tts || "",

                voice: formatTTSVoice(item.tts || ""),

                subtitle:
                    item.subtitle || "",

                tts:
                    item.tts || ""
            });

        }

        hotdealScenes.push({
            type: "ending",
            sceneType: "ending",
            script: director.ending?.tts || "",
            voice: formatTTSVoice(director.ending?.tts || ""),
            subtitle: director.ending?.subtitle || "",
            tts: director.ending?.tts || ""
        });

        director.scenes =
            hotdealScenes;

        /*
         * createVideo()가 사용할 수 있도록
         * 카드 제작에 필요한 원본 상품정보를 보존한다.
         */
        director.hotdeal = true;
        director.hotdealProducts =
            hotdealProducts;

    }
    else {

        director =
            await createShoppingDirector(
                product
            );

        for (const scene of director.scenes) {
            scene.product = product;
        }

    }

}
else if (channelName === "history") {

    director =
        await createHistoryDirector(
            topic
        );

}
else if (channelName === "animal") {

    director =
        await createAnimalDirector(
            topic
        );

}
else if (channelName === "science") {
    director =
        await createScienceDirector(
            topic
        );
}
else if (channelName === "ai") {

    director =
        await createAIDirector(
            topic
        );

}
else {

    throw new Error(
        `지원하지 않는 채널입니다: ${channel?.name || "UNKNOWN"}`
    );

}

for (const scene of director.scenes) {
    scene.product = product;
    // Reviewer policy is channel-specific; never apply History checks to shopping.
    if (channelName === "history") scene.category = "history";
}

success(
    "DIRECTOR 완료"
);


            /*
            2 쇼츠 대본
            */




/*
            3 이미지 생성
            */
step("IMAGE");

/*
=========================================================
COUPANG PRODUCT GLOBAL IMAGE ADAPTER
=========================================================

일반 쇼츠
    → 기존 aiData.images 그대로 사용

쿠팡 쇼츠
    → 사용자가 등록한 상품 이미지만 사용
    → 모든 장면은 GLOBAL
    → 등록 이미지가 여러 장이면 장면마다 순환 배치
    → ENDING은 video.js가 마지막 이미지를 그대로 유지

DB 이미지 경로:
    /media/products/...

VIDEO가 요구하는 경로:
    실제 로컬 파일 경로

기존 video.js / TTS / subtitle / render는 수정하지 않는다.
=========================================================
*/

/*
=========================================================
DIRECT IMAGE FLOW
=========================================================

일반 쇼츠
    script
        ↓
createImage(director)

쿠팡 쇼츠
    등록된 PRODUCT IMAGE 사용

Creator 내부에서
Engine / Search Planner를 다시 호출하지 않는다.
=========================================================
*/



/*
=========================================================
GENERAL / SHOPPING IMAGE
=========================================================

Director가 결정한 scenes를
기존 IMAGE ENGINE에 그대로 전달한다.

이미지 엔진은 기존 Shopping에서 사용하던
Pixabay / Pexels / Pollinations 공급망을 사용한다.

Director 이후 IMAGE는 반드시 1회만 실행한다.
=========================================================
*/

step("IMAGE");

let images = [];

if (channelName === "history") {
    // History uses only pre-downloaded, licensed archive files selected by Director.
    // Never fall back to unreviewed image searches.
    images = director.scenes.map((scene, index) => {
        const asset = scene.preflightAsset;
        if (!asset?.file || !fs.existsSync(asset.file) || fs.statSync(asset.file).size < 5000) {
            throw new Error(`[HISTORY ASSET PLAN] Scene ${index + 1} has no valid downloaded image`);
        }
        return {
            scene: index + 1, sceneType: scene.sceneType,
            keyword: scene.coreSubject, coreSubject: scene.coreSubject,
            file: asset.file, provider: asset.provider, sourceUrl: asset.sourceUrl,
            license: asset.license, mediaType: "image", score: 100
        };
    });
    console.log("[HISTORY ASSET PLAN] mapped", images.length, "downloaded files");
}
else if (
    channelName === "shopping" &&
    options?.hotdeal === true
) {
    const cards = hotdealCards || [];
    images = [];

    if (cards.length > 0) {
        // Scene 1: Hook (1번 카드 사용)
        images.push({
            scene: 1,
            file: cards[0].cardFile,
            mediaType: "image",
            provider: "hotdeal-card",
            score: 100
        });

        // Scene 2 ~ N+1: 상품 카드들 (각 순서 매칭: Scene 2 = 1번 카드, Scene 3 = 2번 카드)
        cards.forEach((card, idx) => {
            images.push({
                scene: idx + 2,
                file: card.cardFile,
                mediaType: "image",
                provider: "hotdeal-card",
                score: 100
            });
        });

        // Scene N+2: Ending (마지막 카드 사용)
        const totalScenes = director?.scenes?.length || (cards.length + 2);
        for (let s = cards.length + 2; s <= totalScenes; s++) {
            images.push({
                scene: s,
                file: cards[cards.length - 1].cardFile,
                mediaType: "image",
                provider: "hotdeal-card",
                score: 100
            });
        }
    }

    console.log("[HOTDEAL IMAGES MAPPED]", images.map(img => ({ scene: img.scene, file: img.file.split("/").pop() })));

    success(
        `HOTDEAL CARD ${images.length}장`
    );

}
else {

    /*
     * 기존 IMAGE ENGINE
     * 일반 Shopping / History / Animal / Science / AI
     * 기존 동작 그대로 유지
     */

    images =
        await createImage(
            director
        );

    success(
        `IMAGE ${images.length}장`
    );

}




            /*
            4 음성 생성
            */
step("TTS");

const voices =
    await createTTS(
        director
    );

if (channelName === "history") {
    validateHistoryProduction(director, images, voices);
}

success(
    "TTS 완료"
);


            /*
            5 자막 생성
            */
step("SUBTITLE");

const subtitle =
    await createSubtitle(
        director,
        voices
    );

success(
    "SUBTITLE 완료"
);

            /*
            6 영상 생성
            */
step("VIDEO");

const video =
    await createVideo(
        director,
        images,
        voices,
        channelName
    );

debug(video);

if(!video){
    throw new Error("createVideo() returned undefined");
}

if (channelName === "history") {
    validateHistoryProduction(director, images, voices, video);
}

success(
    "VIDEO 완료"
);

// History preview exits before metadata, YouTube, Instagram, Threads and cleanup.
// Never enable preview for a different channel by accident.
if (options?.previewOnly === true && channelName === "history") {
    console.log("[HISTORY PREVIEW] RENDER COMPLETE - ALL UPLOADS SKIPPED");
    return { success: true, previewOnly: true, topic, video: video.file, director, images };
}

debug(video.file);

            /*
            7 썸네일 생성
            */
step("THUMBNAIL");

const thumbnail = {
    file: null
};

debug(
    "THUMBNAIL DISABLED"
);


            /*
            8 메타데이터 생성
            */
step("METADATA");

/*
    =========================================================
    COUPANG PRODUCT

    쿠팡 Open API를 사용하지 않는다.

    사용자가 직접 등록한
    쿠팡 파트너스 링크를 그대로 사용한다.

    AI는 링크를 생성하거나 수정하지 않는다.
    =========================================================
*/



const metadata =
    await createMetadata(
        director,
        {
            product
        }
    );

/*
 * HOTDEAL 전용 쿠팡 파트너스 고지
 *
 * 일반 영상에는 절대 붙이지 않는다.
 */
if (options?.hotdeal === true) {

    const coupangNotice =
        "※ 이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

    const currentDescription =
        String(metadata?.description || "").trim();

    if (!currentDescription.includes("쿠팡 파트너스 활동의 일환")) {

        metadata.description =
            currentDescription
                ? `${currentDescription}\n\n${coupangNotice}`
                : coupangNotice;
    }
}

success(
    "METADATA 완료"
);


success(
    "RENDER 완료"
);


            /*
            9 유튜브 업로드
            */
step("UPLOAD");

section("UPLOAD");

if(!fs.existsSync(video.file)){

    throw new Error(
        "최종 영상이 없습니다."
    );

}


let uploadResult;

try {

    uploadResult =
        await uploadVideo(
            video.file,
            metadata,
            channel,
            topic,
            null
        );

}
catch (error) {

    /*
        YouTube 업로드 한도 때문에 실패한 경우에만
        완성 영상을 안전한 queue 영역으로 복사한다.

        원본 작업파일은 여기서 삭제하지 않는다.
    */
    if (
        error?.channelBlocked === true ||
        error?.shortsAIError ===
            "YOUTUBE_UPLOAD_LIMIT"
    ) {

        const queueJob =
            enqueueShort({
                topic,
                channel,
                video: video.file,
                thumbnail:
                    thumbnail.file,
                metadata
            });

        console.log(
            `[QUEUE] 업로드 제한 영상 보관 완료 : ${queueJob.id}`
        );

        error.queueJobId =
            queueJob.id;
    }

    /*
        Manager가 기존 방식대로
        채널 차단을 처리할 수 있도록
        반드시 원래 오류를 다시 전달한다.
    */
    throw error;
}

success(
    "UPLOAD 완료"
);

debug(uploadResult);


/*
    =========================================================
    INSTAGRAM REELS

    YouTube 업로드가 정상 완료된 뒤 실행한다.

    channel.instagram.enabled === true 인 채널만 게시한다.

    Instagram 게시 실패는 이미 성공한 YouTube 업로드를
    실패 처리하지 않는다.

    AI처럼 Instagram 설정이 없는 채널은 SKIP 한다.
    =========================================================
*/

let instagramResult = null;

if (
    channel?.instagram?.enabled === true
) {

    section("INSTAGRAM REELS");

    const instagram =
        channel.instagram;

    console.log(
        `[INSTAGRAM] 대상 : ${instagram.username || channel.name}`
    );

    try {

        const captionParts = [];

        if (metadata?.title) {

            captionParts.push(
                String(metadata.title).trim()
            );

        }

        if (metadata?.description) {

            const description =
                String(metadata.description).trim();

            if (
                description &&
                description !==
                    String(metadata?.title || "").trim()
            ) {

                captionParts.push(
                    description
                );

            }

        }

        if (
            Array.isArray(metadata?.tags) &&
            metadata.tags.length
        ) {

            const hashtags =
                metadata.tags
                    .map(tag =>
                        String(tag || "")
                            .trim()
                            .replace(/^#/, "")
                            .replace(/\\s+/g, "")
                    )
                    .filter(Boolean)
                    .map(tag => `#${tag}`)
                    .join(" ");

            if (hashtags) {

                captionParts.push(
                    hashtags
                );

            }

        }

        const caption =
            captionParts
                .filter(Boolean)
                .join("\\n\\n")
                .slice(0, 2200);

        instagramResult =
            await uploadInstagramReel(
                video.file,
                {
                    instagramUserId:
                        instagram.instagramUserId,

                    accessToken:
                        instagram.accessToken,

                    username:
                        instagram.username,

                    caption
                }
            );

        success(
            "INSTAGRAM REELS 완료"
        );

        debug(
            instagramResult
        );

    }
    catch (instagramError) {

        /*
            YouTube는 이미 게시 완료된 상태다.

            Instagram 장애 때문에 createShort 전체를
            실패 처리하면 Manager가 같은 주제를 다시
            제작하거나 중복 처리할 위험이 있다.

            따라서 Instagram 실패는 결과에 기록하되
            YouTube 성공 상태는 유지한다.
        */

        console.error(
            "[INSTAGRAM] 게시 실패:",
            instagramError?.message ||
            instagramError
        );

        instagramResult = {

            success: false,

            platform:
                "instagram",

            username:
                instagram.username || "",

            error:
                instagramError?.message ||
                String(instagramError)

        };

    }

}
else {

    console.log(
        `[INSTAGRAM] ${channel?.name || "UNKNOWN"} : SKIP`
    );

}


/*
=========================================================
THREADS
SHOPPING ONLY

Shopping 채널에서만 실행한다.

Threads 게시 실패는 이미 성공한
YouTube / Instagram 업로드를 실패 처리하지 않는다.
=========================================================
*/

let threadsResult = null;

if (
    channelName === "shopping" &&
    channel?.threads?.enabled === true
) {

    section("THREADS");

    const threads =
        channel.threads;

    console.log(
        `[THREADS] 대상 : ${threads.username || channel.name}`
    );

    try {

const threadsProduct =
    options?.hotdeal === true
        ? (
            [...hotdealProducts]
                .sort((a, b) => {

                    const rateA =
                        parseFloat(
                            String(a?.dealRate || 0)
                                .replace(/[^\d.]/g, "")
                        ) || 0;

                    const rateB =
                        parseFloat(
                            String(b?.dealRate || 0)
                                .replace(/[^\d.]/g, "")
                        ) || 0;

                    return rateB - rateA;
                })[0] || null
        )
        : product;

if (
    options?.hotdeal === true &&
    threadsProduct
) {
    console.log(
        "[THREADS HOTDEAL 대표상품]",
        {
            name:
                threadsProduct.name ||
                threadsProduct.productGroup,

            dealRate:
                threadsProduct.dealRate,

            image:
                threadsProduct.image || ""
        }
    );
}


const threadsDirector =
    await createThreadsDirector({
        product:
            threadsProduct,

        shoppingDirector:
            director,

        metadata,

        hotdeal:
            options?.hotdeal === true
    });

        if (!threadsDirector?.finalText) {
            throw new Error(
                "Threads Director finalText 없음"
            );
        }

        threadsResult =
await uploadThreadsText(
    threadsDirector.finalText,
    {
        imageUrl:
            threadsProduct?.productImageUrl ||
            threadsProduct?.image ||
            "",

        threadsUserId:
            threads.threadsUserId,

        accessToken:
            threads.accessToken,

        username:
            threads.username
    }
);

        success(
            "THREADS 완료"
        );

        debug(
            threadsResult
        );

    }
    catch (threadsError) {

        console.error(
            "[THREADS] 게시 실패:",
            threadsError?.message ||
            threadsError
        );

        threadsResult = {
            success: false,
            platform: "threads",
            username:
                threads.username || "",
            error:
                threadsError?.message ||
                String(threadsError)
        };
    }

}
else {

    console.log(
        `[THREADS] ${channel?.name || "UNKNOWN"} : SKIP`
    );

}

/*
    플랫폼 업로드 처리 이후 작업파일을 정리한다.
*/
/*
    HOTDEAL 상품 링크 페이지 갱신

    - HOTDEAL일 때만 실행
    - 이전 HOTDEAL 상품은 제거
    - 이번 HOTDEAL 상품으로 통째로 교체
    - 전체상품 영역은 건드리지 않는다.
*/
if (
    options?.hotdeal === true &&
    hotdealProducts.length > 0
) {
    await updateShopPage(
        hotdealProducts
    );
}

cleanAfterUpload();


            /*
            최종 반환
            */


return {

    success:true,

    topic,

    video: video.file,

    thumbnail: thumbnail.file,

    youtube: uploadResult,

    instagram: instagramResult,
    threads: threadsResult

};


}catch(error){

    console.error(
        error
    );

    throw error;

}

}




