import fs from "fs";
import { createAI } from "./ai.js";
import { createScript } from "./script.js";
import { createImage } from "./image.js";
import { createTTS } from "./tts.js";
import { createSubtitle } from "./subtitle.js";
import { createVideo } from "./video.js";
import { createThumbnail } from "./thumbnail.js";
import { createMetadata } from "./metadata.js";
import { uploadVideo } from "./upload.js";
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

step("AI");

cleanBeforeJob();


/*
=========================================================
COUPANG PRODUCT CONTEXT
=========================================================

상품 QUICK 제작일 경우
AI 단계부터 동일한 product 객체를 사용한다.

일반 쇼츠는 null이므로
기존 AI 흐름을 그대로 사용한다.
=========================================================
*/

const product =
    options?.product || null;

let aiData;

for(let i=0;i<3;i++){

    try{

        aiData = await createAI(
            topic,
            0,
            {
                product
            }
        );

        break;

    }catch(e){

        console.log(
            `AI 재시도 ${i+1}/3`
        );

        if(i===2)
            throw e;

    }

}



success(
    "AI 완료"
);


            /*
            2 쇼츠 대본
            */
step("SCRIPT");

            const script =
            await createScript(
                aiData
            );



success(
    "SCRIPT 완료"
);


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
    createImage(script)

쿠팡 쇼츠
    등록된 PRODUCT IMAGE 사용

Creator 내부에서
Engine / Search Planner를 다시 호출하지 않는다.
=========================================================
*/

let images = [];


/*
=========================================================
GENERAL SHORTS IMAGE
=========================================================

쿠팡 상품이 없는 일반 쇼츠만
기존 image.js를 직접 호출한다.
=========================================================
*/

if(!product){

    images =
        await createImage(
            script
        );

}




if(
    product &&
    Array.isArray(product.images) &&
    product.images.length
){

    const productFiles =
        product.images
        .map(imagePath=>{

            const value =
                String(
                    imagePath || ""
                ).trim();

            if(!value){
                return "";
            }


            /*
                /media/... 형태는
                프로젝트 실제 로컬 경로로 변환한다.
            */

            if(
                value.startsWith(
                    "/media/"
                )
            ){

                return (
                    process.cwd() +
                    value
                );

            }


            /*
                media/... 형태도 지원한다.
            */

            if(
                value.startsWith(
                    "media/"
                )
            ){

                return (
                    process.cwd() +
                    "/" +
                    value
                );

            }


            /*
                이미 절대경로라면 그대로 사용한다.
            */

            return value;

        })
        .filter(file=>
            file &&
            fs.existsSync(file)
        );


    if(productFiles.length){

        /*
            createTTS()가 실제 음성을 만드는 항목과
            동일한 기준으로 이미지 scene 수를 계산한다.

            Hook + 본문은 각각 scene을 가진다.

            Ending은 별도 이미지를 만들지 않는다.
            video.js가 마지막 이미지를 유지한다.
        */

        const visualItems =
            script.filter(item=>{

                if(!item){
                    return false;
                }


                if(
                    item.type === "ending"
                ){
                    return false;
                }


                const text =
                    String(
                        item.text ||
                        item.voice ||
                        item.subtitle ||
                        ""
                    ).trim();


                return Boolean(text);

            });


        const productImages = [];


        for(
            let i=0;
            i<visualItems.length;
            i++
        ){

            const file =
                productFiles[
                    i % productFiles.length
                ];


            productImages.push({

                scene:
                    i + 1,

                sceneType:
                    "global",

                file,

                provider:
                    "COUPANG",

                subject:
                    product.name || topic,

                searchSubject:
                    product.keyword ||
                    product.name ||
                    topic,

                productId:
                    product.id || null

            });

        }


        images =
            productImages;


        /*
            script도 GLOBAL로 통일한다.

            영상 효과 판단은 script의 sceneType을
            사용하므로 쿠팡은 ranking 등으로 가지 않는다.
        */

        for(const item of script){

            if(
                item &&
                item.type !== "ending"
            ){

                item.sceneType =
                    "global";

            }

        }


        success(
            `COUPANG GLOBAL IMAGE ${productFiles.length}장 / SCENE ${images.length}개`
        );

    }
    else{

        console.log(
            "[COUPANG IMAGE] 등록 이미지 파일을 찾을 수 없어 기존 AI 이미지를 사용합니다."
        );

    }

}


success(
    `IMAGE ${images.length}장`
);

            /*
            4 음성 생성
            */
step("TTS");

            const voices =
            await createTTS(
                script
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
                script,
                voices
            );


success(
    "SUBTITLE 완료"
);

            /*
            6 영상 생성
            */
step("VIDEO");

const video = await createVideo(
    script,
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
                aiData,
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
        aiData,
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
    실제 YouTube 업로드 성공시에만 정리한다.
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

    youtube: uploadResult

};


}catch(error){

    console.error(
        error
    );

    throw error;

}

}


