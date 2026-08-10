import fs from "fs";
import { createImage } from "./image.js";
import { createTTS } from "./tts.js";
import { createSubtitle } from "./subtitle.js";
import { createVideo } from "./video.js";
import { createThumbnail } from "./thumbnail.js";
import { createMetadata } from "./metadata.js";
import { uploadVideo } from "./upload.js";
import { uploadInstagramReel } from "./instagram/instagramUploader.js";
import { createShoppingDirector } from "./shopping/director.js";
import { createHistoryDirector } from "./history/director.js";
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

const channelName =
    String(channel?.name || "")
        .trim()
        .toLowerCase();

if (channelName === "shopping") {

    director =
        await createShoppingDirector(
            product
        );

    for (const scene of director.scenes) {
        scene.product = product;
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

images =
    await createImage(
        director
    );

success(
    `IMAGE ${images.length}장`
);




            /*
            4 음성 생성
            */
step("TTS");

const voices =
    await createTTS(
        director
    );

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
        voices
    );

debug(video);

if(!video){
    throw new Error("createVideo() returned undefined");
}

success(
    "VIDEO 완료"
);

debug(video.file);

            /*
            7 썸네일 생성
            */
step("THUMBNAIL");

const thumbnail =
    await createThumbnail(
        director,
        images
    );

success(
    "THUMBNAIL 완료"
);

debug(thumbnail.file);


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

if(!fs.existsSync(thumbnail.file)){

    throw new Error(
        "썸네일이 없습니다."
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
            thumbnail.file
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
    플랫폼 업로드 처리 이후 작업파일을 정리한다.
*/
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

    instagram: instagramResult

};


}catch(error){

    console.error(
        error
    );

    throw error;

}

}


