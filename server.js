import "dotenv/config";

import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createImage } from "./modules/image.js";
import { createTTS } from "./modules/tts.js";
import { createSubtitle } from "./modules/subtitle.js";
import { createVideo } from "./modules/video.js";
import { createThumbnail } from "./modules/thumbnail.js";
import { createMetadata } from "./modules/metadata.js";
import { uploadVideo } from "./modules/upload.js";
import { execSync } from "child_process";
import {cleanBeforeJob, cleanAfterUpload} from "./modules/cleanup.js";
import {section,success,debug,step} from "./modules/logger.js";
import * as BrainQueue from "./brain/brain.js";
import * as Brain from "./brain/brain.js";
import {
    startMasterScheduler,
    getMasterSchedulerStatus
} from "./automation/masterScheduler.js";
import { createShort } from "./modules/createShort.js";
import * as CoupangProductStore from "./modules/coupang/productStore.js";
import { resolveCoupangProduct } from "./modules/coupang/productResolver.js";
import Hotdeal from "./coupang-hotdeal/index.js";
import {
    searchProduct,
    createPartnerLink
} from "./modules/coupang/index_api.js";
import {
    downloadImage
} from "./modules/image/download.js";


const app = express();

const PORT = 3000;


/*
=========================================================
COUPANG PRODUCT IMAGE UPLOAD
=========================================================

휴대폰 갤러리에서 선택한 상품 이미지를
media/products/<productId>/ 에 저장한다.

DB에는 파일 자체가 아닌
/media/products/... 경로만 저장한다.
=========================================================
*/

const PRODUCT_IMAGE_DIR =
    path.join(
        process.cwd(),
        "media",
        "products"
    );


fs.mkdirSync(
    PRODUCT_IMAGE_DIR,
    {
        recursive:true
    }
);


const productImageStorage =
    multer.diskStorage({

        destination(
            req,
            file,
            cb
        ){

            const productId =
                String(
                    req.params.id || ""
                )
                .replace(
                    /[^a-zA-Z0-9_-]/g,
                    ""
                );


            if(!productId){

                cb(
                    new Error(
                        "상품 ID가 없습니다."
                    )
                );

                return;

            }


            const dir =
                path.join(
                    PRODUCT_IMAGE_DIR,
                    productId
                );


            fs.mkdirSync(
                dir,
                {
                    recursive:true
                }
            );


            cb(
                null,
                dir
            );

        },


        filename(
            req,
            file,
            cb
        ){

            const ext =
                path.extname(
                    file.originalname || ""
                )
                .toLowerCase();


            const safeExt =
                [
                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".webp"
                ]
                .includes(ext)
                    ? ext
                    : ".jpg";


            cb(
                null,
                `${Date.now()}_${Math.random()
                    .toString(36)
                    .slice(2,8)}${safeExt}`
            );

        }

    });


const productImageUpload =
    multer({

        storage:
            productImageStorage,

        limits:{

            files:20,

            fileSize:
                15 * 1024 * 1024

        },

        fileFilter(
            req,
            file,
            cb
        ){

            if(
                file.mimetype &&
                file.mimetype.startsWith(
                    "image/"
                )
            ){

                cb(
                    null,
                    true
                );

                return;

            }


            cb(
                new Error(
                    "이미지 파일만 업로드할 수 있습니다."
                )
            );

        }

    });



app.use(
    cors()
);


app.use(
    express.json({
        limit:"100mb"
    })
);


app.use(
    express.static(
        path.join(
            process.cwd(),
            "public"
        )
    )
);


app.use(
    "/media",
    express.static(
        path.join(
            process.cwd(),
            "media"
        )
    )
);



app.get(
    "/",
    (req,res)=>{

        res.sendFile(
            path.join(
                process.cwd(),
                "public/index.html"
            )
        );

    }
);

app.post(
    "/create",
    async(req,res)=>{

        try{

const result =
    await BrainQueue.start({

        mode: "QUICK",

        topic: req.body.topic,

        count: 1

    });

res.json(result);

        }catch(error){

            console.error(
                error
            );

            res.status(500)
            .json({

                success:false,

                error:
                error.message

            });

        }

    }
);

/*
=========================================================
SHOPPING QUICK CREATE

상품명
    ↓
쿠팡 파트너스 API
    ↓
상품정보 / 이미지 / 파트너스 링크
    ↓
Brain QUICK → Shopping
=========================================================
*/
app.post(
    "/shopping/create",
    async (req, res) => {

        try {

            const keyword =
                String(
                    req.body?.productName || ""
                ).trim();

            if (!keyword) {

                return res.status(400).json({
                    success: false,
                    error: "상품명을 입력해주세요."
                });

            }

            console.log(
                `[SHOPPING QUICK] SEARCH : ${keyword}`
            );

            /*
             * 1. 쿠팡 파트너스 API 상품 검색
             */
            const apiProduct =
                await searchProduct(
                    keyword
                );

            if (!apiProduct) {

                return res.status(404).json({
                    success: false,
                    error: "쿠팡 상품을 찾지 못했습니다."
                });

            }

            /*
             * 2. 파트너스 링크 생성
             */
            const partnerUrl =
                await createPartnerLink(
                    apiProduct.url
                );

            if (!partnerUrl) {

                throw new Error(
                    "쿠팡 파트너스 링크 생성 실패"
                );

            }

            /*
             * 3. 상품 이미지 로컬 저장
             *
             * 기존 Shopping IMAGE 엔진이
             * product.images의 로컬 파일을 사용하므로
             * API 이미지를 먼저 저장한다.
             */
            const imageId =
                `quick_${Date.now()}`;

            const imageDir =
                path.join(
                    PRODUCT_IMAGE_DIR,
                    imageId
                );

            fs.mkdirSync(
                imageDir,
                {
                    recursive: true
                }
            );

            const imageFile =
                path.join(
                    imageDir,
                    "product.jpg"
                );

            await downloadImage(
                apiProduct.image,
                imageFile
            );

            if (
                !fs.existsSync(imageFile) ||
                fs.statSync(imageFile).size === 0
            ) {

                throw new Error(
                    "쿠팡 상품 이미지 저장 실패"
                );

            }

            /*
             * 기존 Shopping 생산라인이 사용하는
             * Product 객체 형식
             */
            const product = {

                id:
                    imageId,

                name:
                    apiProduct.title ||
                    keyword,

                keyword,

                description:
                    "",

                price:
                    apiProduct.price,

                partnerUrl,

                images: [
                    imageFile
                ],

                enabled:
                    true

            };

            console.log(
                "[SHOPPING QUICK PRODUCT]",
                {
                    name: product.name,
                    price: product.price,
                    partnerUrl: product.partnerUrl,
                    image: product.images[0]
                }
            );

            /*
             * 4. 기존 Brain QUICK 생산라인
             *
             * 새 쇼핑 생산라인을 만들지 않는다.
             */
            BrainQueue.start({

                mode:
                    "QUICK",

                topic:
                    product.name,

                count:
                    1,

                channel:
                    "Shopping",

                product

            }).catch(error => {

                console.error(
                    "[SHOPPING QUICK BRAIN ERROR]",
                    error
                );

            });

            /*
             * 제작은 Brain에서 계속 진행하고
             * UI에는 즉시 시작 응답
             */
            res.json({

                success:
                    true,

                action:
                    "brain_quick_start",

                product: {
                    name:
                        product.name,

                    price:
                        product.price
                }

            });

        }
        catch (error) {

            console.error(
                "[SHOPPING QUICK ERROR]",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    error.message
            });

        }

    }
);


app.post(
"/brain/start",
async (req,res)=>{

    const type =
        String(
            req.body.type ||
            "SHORTS"
        ).toUpperCase();

const count =
        Number(req.body.count || 20);

    const categories =
        req.body.categories || [
    "history",
    "animal",
    "ai"
        ];


/*
    =========================================================
    BRAIN START / RESUME

    정지 상태
        → 기존 작업 재개

    그 외
        → 새로운 AUTO 작업 시작

    기존 Planner Pool은
    재개 시 다시 생성하지 않는다.
    =========================================================
*/

const brainStatus =
    BrainQueue.getStatus();


if (
    brainStatus.running &&
    brainStatus.paused
) {

    await BrainQueue.resume();


    res.json({

        success: true,

        action: "resume"

    });


    return;

}


if (brainStatus.running) {

    /*
        이미 제작 중이면
        중복 Planner 실행 금지
    */

    res.json({

        success: true,

        action: "already_running"

    });


    return;

}


/*
    =========================================================
    AUTO 작업은 백그라운드 실행

    중요

    - HTTP 요청은 즉시 UI에 반환한다.
    - 실제 제작은 Brain → Planner → Manager에서 계속된다.
    - QUICK /create 흐름은 건드리지 않는다.
    - 작업 오류는 여기서 반드시 잡아서
      unhandled rejection을 방지한다.
    =========================================================
*/

BrainQueue.start({

    mode: "AUTO",

    type,

    count,

    categories

}).catch(error => {

    console.error(
        "[BRAIN AUTO ERROR]",
        error
    );

});


res.json({

    success: true,

    action: "start"

});

}
);

app.post(
"/brain/stop",
async (req,res)=>{

    await BrainQueue.pause();

    res.json({
        success:true
    });

}
);

app.post(
"/brain/cancel",
(req,res)=>{

BrainQueue.cancel();

    res.json({

        success:true

    });

}
);


app.get("/brain/status",(req,res)=>{

    const q = BrainQueue.getStatus();

    const width = 20;

    const current = Math.min(
        q.current,
        q.target
    );

    const done =
        q.target > 0
        ? Math.round(
            current /
            q.target *
            width
        )
        : 0;

    const bar =
        "█".repeat(done)
        +
        "□".repeat(width - done);

    const list = (q.topics || [])
        .map((item,index)=>{

            const topic =
                typeof item === "string"
                    ? item
                    : item?.topic || "";

            const channel =
                typeof item === "object"
                    ? item?.channel || ""
                    : "";

            const status =
                typeof item === "object"
                    ? item?.status || "waiting"
                    : "waiting";

            const label =
                channel
                    ? `[${channel}] ${topic}`
                    : topic;


            if(status === "completed"){

                return `✅ ${index + 1}. ${label}`;

            }


            if(status === "failed"){

                return `❌ ${index + 1}. ${label}`;

            }


            /*
                YouTube 업로드 제한으로
                실제 제작을 시작하지 않은 작업
            */
            if(status === "blocked"){

                return `🚫 ${index + 1}. ${label}`;

            }


            if(status === "processing"){

                return `🔄 ${index + 1}. ${label}`;

            }


            return `⏳ ${index + 1}. ${label}`;

        })
        .join("<br>");

    let currentTopic =
        q.currentTopic || "";

    if(q.status === "완료"){

        if(q.target > 0 && q.current < q.target){

            currentTopic =
                `✅ 제작 종료 : ${q.current}/${q.target}개 완료`;

        }
        else{

            currentTopic =
                "🎉 모든 제작이 완료되었습니다.";

        }

    }
    else if(q.status === "정지중"){

        currentTopic =
            "⏳ 정지 중입니다. 현재 작업 완료 후 정지합니다.";

    }
    else if(q.status === "정지"){

        currentTopic =
            "⏸ 작업이 중지되었습니다. 실행을 누르면 이어서 시작합니다.";

    }
    else if(q.status === "대기"){

        currentTopic =
            "현재 작업 없음";

    }

    res.json({

        status: q.status,

        target: q.target,

        current,

        currentTopic,

        bar,

        list

    });

});



/*
=========================================================
COUPANG PRODUCT IMAGE API
=========================================================
*/

app.post(
"/coupang/products/:id/images",
productImageUpload.array(
    "images",
    20
),
(req,res)=>{

    try{

        const product =
            CoupangProductStore.getProduct(
                req.params.id
            );


        if(!product){

            for(
                const file of req.files || []
            ){

                try{

                    fs.unlinkSync(
                        file.path
                    );

                }catch{}

            }


            res.status(404).json({

                success:false,

                error:
                    "상품을 찾을 수 없습니다."

            });

            return;

        }


        const uploaded =
            (req.files || [])
            .map(
                file =>
                    `/media/products/${product.id}/${file.filename}`
            );


        if(uploaded.length===0){

            res.status(400).json({

                success:false,

                error:
                    "업로드된 이미지가 없습니다."

            });

            return;

        }


        const images = [

            ...(
                Array.isArray(
                    product.images
                )
                    ? product.images
                    : []
            ),

            ...uploaded

        ];


        const updated =
            CoupangProductStore.updateProduct(
                product.id,
                {
                    images
                }
            );


        res.json({

            success:true,

            count:
                uploaded.length,

            uploaded,

            product:
                updated

        });

    }
    catch(error){

        console.error(
            "[COUPANG PRODUCT IMAGE UPLOAD]",
            error
        );


        res.status(400).json({

            success:false,

            error:
                error.message

        });

    }

});


/*
=========================================================
COUPANG PRODUCT API
=========================================================
*/

app.get("/coupang/products",(req,res)=>{

    try{

        const products =
            CoupangProductStore.getProducts();

        res.json({
            success:true,
            count:products.length,
            products
        });

    }catch(error){

        console.error(
            "[COUPANG PRODUCTS GET]",
            error
        );

        res.status(500).json({
            success:false,
            error:error.message
        });

    }

});


app.post("/coupang/products",(req,res)=>{

    try{

        const product =
            CoupangProductStore.addProduct({

                name:req.body?.name,

                keyword:req.body?.keyword,

                partnerUrl:
                    req.body?.partnerUrl,

                enabled:
                    req.body?.enabled

            });

        res.json({
            success:true,
            product
        });

    }catch(error){

        console.error(
            "[COUPANG PRODUCT ADD]",
            error.message
        );

        res.status(400).json({
            success:false,
            error:error.message
        });

    }

});


app.put("/coupang/products/:id",(req,res)=>{

    try{

        const input = {};

        if(req.body?.name !== undefined)
            input.name = req.body.name;

        if(req.body?.keyword !== undefined)
            input.keyword = req.body.keyword;

        if(req.body?.partnerUrl !== undefined)
            input.partnerUrl = req.body.partnerUrl;

        if(req.body?.enabled !== undefined)
            input.enabled = req.body.enabled;


        const product =
            CoupangProductStore.updateProduct(
                req.params.id,
                input
            );

        res.json({
            success:true,
            product
        });

    }catch(error){

        console.error(
            "[COUPANG PRODUCT UPDATE]",
            error.message
        );

        res.status(400).json({
            success:false,
            error:error.message
        });

    }

});


app.post(
"/coupang/products/:id/enabled",
(req,res)=>{

    try{

        if(
            typeof req.body?.enabled !==
            "boolean"
        ){

            res.status(400).json({
                success:false,
                error:
                    "enabled 값은 true 또는 false여야 합니다."
            });

            return;

        }


        const product =
            CoupangProductStore.setProductEnabled(
                req.params.id,
                req.body.enabled
            );

        res.json({
            success:true,
            product
        });

    }catch(error){

        console.error(
            "[COUPANG PRODUCT ENABLE]",
            error.message
        );

        res.status(400).json({
            success:false,
            error:error.message
        });

    }

});





/*
=========================================================
COUPANG PRODUCT → QUICK CREATE
=========================================================

저장된 쿠팡 상품을 기존 QUICK 생산라인에 투입한다.

상품명
    → AI 주제

channel
    → Shopping 강제 지정

product
    → Manager → createShort → metadata까지 전달
*/

app.post(
"/coupang/products/:id/create",
async (req,res)=>{

    try{

        const product =
            CoupangProductStore.getProduct(
                req.params.id
            );


        if(!product){

            res.status(404).json({

                success:false,

                error:
                    "상품을 찾을 수 없습니다."

            });

            return;

        }


        if(product.enabled === false){

            res.status(400).json({

                success:false,

                error:
                    "비활성화된 상품입니다."

            });

            return;

        }


        /*
            다른 Brain 작업이 실행 중이면
            중복 생산을 시작하지 않는다.
        */

        const brainStatus =
            BrainQueue.getStatus();


        if(brainStatus.running){

            res.status(409).json({

                success:false,

                error:
                    "현재 다른 제작 작업이 진행 중입니다.",

                status:
                    brainStatus.status

            });

            return;

        }


        /*
            =========================================================
            COUPANG PRODUCT RESOLVER
            =========================================================

            저장된 상품
                ↓
            partnerUrl 실제 상품 확인
                ↓
            실상품 정보 병합
                ↓
            Brain → Planner → Manager → createShort

            중요
            ---------------------------------------------------------
            - DB 수정 없음
            - partnerUrl 변경 없음
            - 등록 images 변경 없음
            - Resolver는 쿠팡 QUICK 제작에서 1회만 실행
            - Resolver 실패 시 잘못된 상품으로 영상을 만들지 않음
            =========================================================
        */

let resolvedProduct =
    product;

try{

    const result =
        await resolveCoupangProduct(
            product
        );

    if(
        result &&
        result.resolved === true
    ){

        resolvedProduct =
            result;

        console.log(
            "[COUPANG] Resolver 성공"
        );

    }
    else{

        console.log(
            "[COUPANG] Resolver 실패 - DB 상품정보 사용"
        );

    }

}
catch(e){

    console.log(
        "[COUPANG] Resolver 오류 - DB 상품정보 사용"
    );

    console.log(
        e.message
    );

}


        /*
            원본 등록 데이터 + Resolver 실상품 정보

            원본의 핵심 사용자 데이터는
            명시적으로 다시 고정한다.

            name
                사용자가 등록한 표시 상품명

            partnerUrl
                사용자가 등록한 파트너스 링크

            images
                사용자가 등록한 상품 이미지
        */

        const productionProduct = {

            ...product,

            ...resolvedProduct,

            id:
                product.id,

            name:
                product.name,

            keyword:
                product.keyword ||
                product.name,

            partnerUrl:
                product.partnerUrl,

            images:
                Array.isArray(product.images)
                    ? [...product.images]
                    : []

        };


        console.log(
            "[COUPANG RESOLVER PASS]",
            {
                storedName:
                    productionProduct.name,

                productTitle:
                    productionProduct.productTitle,

                productId:
                    productionProduct.productId,

                itemId:
                    productionProduct.itemId,

                exactMatch:
                    productionProduct.exactMatch,

                resolved:
                    productionProduct.resolved
            }
        );


        /*
            QUICK 생산라인 실행

            Resolver가 끝난 뒤
            HTTP 응답은 즉시 반환하고
            실제 쇼츠 제작은 백그라운드에서 계속한다.
        */

        BrainQueue.start({

            mode:
                "QUICK",

            topic:
                productionProduct.productTitle ||
                productionProduct.name,

            count:
                1,

            channel:
                "Shopping",

            product:
                productionProduct

        }).catch(error=>{

            console.error(
                "[COUPANG QUICK CREATE ERROR]",
                error
            );

        });


        res.json({

            success:true,

            action:
                "start",

            product:{

                id:
                    product.id,

                name:
                    product.name,

                partnerUrl:
                    product.partnerUrl

            },

            channel:
                "Shopping"

        });

    }
    catch(error){

        console.error(
            "[COUPANG QUICK CREATE]",
            error
        );


        res.status(500).json({

            success:false,

            error:
                error.message

        });

    }

}
);

/*
=========================================================
COUPANG PRODUCT DELETE API
=========================================================
*/

app.delete(
"/coupang/products/:id",
(req,res)=>{

    try{

        const id =
            String(
                req.params.id || ""
            ).trim();


        const product =
            CoupangProductStore.getProduct(
                id
            );


        if(!product){

            res.status(404).json({
                success:false,
                error:
                    "상품을 찾을 수 없습니다."
            });

            return;

        }


        const deleted =
            CoupangProductStore.deleteProduct(
                id
            );


        const productDir =
            path.join(
                PRODUCT_IMAGE_DIR,
                id
            );


        try{

            if(
                fs.existsSync(
                    productDir
                )
            ){

                fs.rmSync(
                    productDir,
                    {
                        recursive:true,
                        force:true
                    }
                );

            }

        }catch(imageError){

            console.error(
                "[COUPANG PRODUCT IMAGE DELETE]",
                imageError.message
            );

        }


        res.json({
            success:true,
            product:deleted
        });

    }
    catch(error){

        console.error(
            "[COUPANG PRODUCT DELETE]",
            error.message
        );


        res.status(400).json({
            success:false,
            error:error.message
        });

    }

}
);




/*
=========================================================
HOTDEAL PRODUCT MANAGEMENT API
=========================================================
*/

// ① 상품 추가
app.post("/hotdeal/products", (req, res) => {
    try {
        const product = Hotdeal.addProduct(
            req.body?.name,
            req.body?.keyword
        );

        res.json({
            success: true,
            product
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// ② 상품 제거 — 비활성
app.delete("/hotdeal/products/:name", (req, res) => {
    try {
        const product = Hotdeal.removeProduct(
            decodeURIComponent(req.params.name)
        );

        res.json({
            success: true,
            product
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// ③ 완전삭제
app.delete("/hotdeal/products/:name/purge", (req, res) => {
    try {
        const product = Hotdeal.deleteProduct(
            decodeURIComponent(req.params.name)
        );

        res.json({
            success: true,
            product
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// ④ 상품목록 — 활성 / 비활성
app.get("/hotdeal/products", (req, res) => {
    try {
        const products = Hotdeal.getProductList();

        res.json({
            success: true,
            products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post("/hotdeal/products/:name/enabled", (req, res) => {
    try {
        const product = Hotdeal.setProductEnabled(
            decodeURIComponent(req.params.name),
            req.body?.enabled
        );

        res.json({
            success: true,
            product
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

app.put("/hotdeal/products/:name/enabled", (req, res) => {
    try {
        const product = Hotdeal.setProductEnabled(
            decodeURIComponent(req.params.name),
            req.body?.enabled
        );

        res.json({
            success: true,
            product
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// ⑤ 상품정보 갱신 — 활성 상품군 전체 갱신
app.post("/hotdeal/refresh", async (req, res) => {
    try {
        const activeProducts =
            Hotdeal.getActiveProducts();

        if (activeProducts.length === 0) {
            return res.status(400).json({
                success: false,
                error: "활성 상품이 없습니다."
            });
        }

        const productGroups =
            activeProducts.map(
                product => product.name
            );

        const products =
            await Hotdeal.run(productGroups);

        res.json({
            success: true,
            count: products.length,
            total: activeProducts.length,
            products
        });

    } catch (error) {
        console.error(
            "[HOTDEAL REFRESH]",
            error
        );

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ⑤ 상품정보 검색
app.get("/hotdeal/search", async (req, res) => {
    try {
        const keyword = req.query?.keyword;

        const products = await Hotdeal.searchProductInfo(
            keyword,
            Number(req.query?.limit) || 10
        );

        res.json({
            success: true,
            count: products.length,
            products
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// ⑥ 쇼츠 제작 — ⑤에서 갱신된 상품을 바로 기존 Brain 생산라인으로 전달
app.post("/hotdeal/create", async (req, res) => {
    try {
        const activeProducts =
            Hotdeal.getActiveProducts();

        if (activeProducts.length === 0) {
            return res.status(400).json({
                success: false,
                error: "활성 상품이 없습니다."
            });
        }

        /*
         * ⑤에서 이미 상품정보 갱신이 완료되었으므로
         * ⑥에서는 Hotdeal.run()을 다시 호출하지 않는다.
         *
         * 기존 Brain → Planner → Manager → createShort
         * 생산라인으로 바로 전달한다.
         */

        const todayPath =
            path.join(
                process.cwd(),
                "coupang-hotdeal",
                "data",
                "today-products.json"
            );

        if (!fs.existsSync(todayPath)) {
            return res.status(400).json({
                success: false,
                error: "상품정보 갱신 결과가 없습니다. ⑤ 상품정보 갱신을 먼저 실행하세요."
            });
        }

        const todayData =
            JSON.parse(
                fs.readFileSync(
                    todayPath,
                    "utf-8"
                )
            );

        const products =
            Array.isArray(todayData.products)
                ? todayData.products
                : [];

        const activeNames =
            new Set(
                activeProducts.map(
                    product => product.name
                )
            );

        const hotdealProducts =
            products.filter(
                product =>
                    activeNames.has(product.productGroup)
            );

        if (hotdealProducts.length === 0) {
            return res.status(400).json({
                success: false,
                error: "갱신된 활성 HOTDEAL 상품이 없습니다. ⑤ 상품정보 갱신을 확인하세요."
            });
        }

        /*
         * HOTDEAL은 상품별로 Brain을 반복 호출하지 않는다.
         *
         * ⑤에서 완성된 상품 전체를 하나의 HOTDEAL 작업으로
         * Brain → Planner → Manager → createShort에 전달한다.
         */
        BrainQueue.start({
            mode:
                "QUICK",

            topic:
                "오늘의 생필품 HOTDEAL",

            count:
                1,

            channel:
                "Shopping",

            type:
                "HOTDEAL",

            products:
                hotdealProducts

        }).catch(error => {
            console.error(
                "[HOTDEAL BRAIN QUICK CREATE ERROR]",
                error
            );
        });

        res.json({
            success: true,
            count: hotdealProducts.length,
            total: activeProducts.length,
            action: "brain_hotdeal_start"
        });

    } catch (error) {

        console.error(
            "[HOTDEAL CREATE]",
            error
        );

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get(
    "/api/scheduler/status",
    (req, res) => {

        try {

            res.json({
                success: true,
                ...getMasterSchedulerStatus()
            });

        }
        catch (error) {

            res.status(500).json({
                success: false,
                error:
                    error?.message ||
                    String(error)
            });

        }

    }
);

app.listen(
    PORT,
    ()=>{

        console.log(
            `ShortsAI FINAL Server Running : ${PORT}`
        );

        startMasterScheduler();

    }
);



