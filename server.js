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
import {
    getInstagramAuthStatuses, configStatus as instagramConfigStatus,
    createAuthorizationUrl, finalizeInstagramAuthorization,
    refreshInstagramTokens
} from "./modules/instagram/instagramAuth.js";

import * as CoupangProductStore from "./modules/coupang/productStore.js";
import { resolveCoupangProduct } from "./modules/coupang/productResolver.js";
import { chooseQuickCoupangProduct } from "./modules/shopping/quickCoupang.js";
import { listCuratorProducts, saveCuratorProduct, removeCuratorProduct, markCuratorPublished } from "./modules/kakaoCurator/store.js";
import { enrichCuratorProduct, prepareCuratorProduct } from "./modules/kakaoCurator/media.js";
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
             * 후보 최대 8개에서 쿠팡 제휴 링크·동일 상품의 실제
             * 이미지 2장 이상을 검증한 다음에만 Brain을 실행한다.
             * 대표 이미지 1장뿐인 첫 상품 때문에 바로 중단하지 않는다.
             */
            const {product, selectedIndex, inspected} =
                await chooseQuickCoupangProduct(keyword);

            console.log("[SHOPPING QUICK PRODUCT]",{
                name:product.name,
                price:product.price,
                candidate:selectedIndex,
                inspected,
                distinctPhotos:product.images.length
            });

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
                        product.price,

                    distinctPhotos:
                        product.images.length,

                    candidate:
                        selectedIndex
                }

            });

        }
        catch (error) {

            console.error(
                "[SHOPPING QUICK ERROR]",
                error
            );

            res.status(/SHOPPING_MEDIA_INSUFFICIENT/.test(error.message) ? 422 : 500).json({
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
 * Curator affiliate links are manually issued by Kakao; the ShortsAI app
 * accepts issued links, not cookie scraping or affiliate-link fabrication.
 */
app.get("/curator/products", (req, res) => {
    try { res.json({ success: true, products: listCuratorProducts() }); }
    catch (error) { res.status(500).json({ success:false, error:error.message }); }
});
app.post("/curator/products", async (req, res) => {
    try {
        const saved=saveCuratorProduct(req.body || {});
        const product=await enrichCuratorProduct(saved);
        res.json({
            success:true,product,
            mediaReady:Boolean(product.name && product.images?.length),
            extractionStatus:product.name && product.images?.length ? "ready" : "pending"
        });
    } catch(error) { res.status(400).json({success:false,error:error.message}); }
});
// The Kakao gift page often exposes a single public preview only. Let the
// owner add multiple actual product photos from mobile when gallery access is
// blocked, without requiring image URLs or changing the issued affiliate URL.
app.post("/curator/products/:id/images",
    productImageUpload.array("images", 12),
    (req,res) => {
        try {
            const saved=listCuratorProducts().find(p=>p.id===req.params.id);
            if(!saved) {
                for(const f of req.files||[]) fs.rmSync(f.path,{force:true});
                return res.status(404).json({success:false,error:"상품을 찾을 수 없습니다."});
            }
            const accepted=[];
            for(const file of req.files||[]){
                const head=fs.readFileSync(file.path).subarray(0,16);
                const isPng=head.length>=8 && head.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
                const isJpg=head[0]===255 && head[1]===216 && head[2]===255;
                const isWebp=head.toString("ascii",0,4)==="RIFF" && head.toString("ascii",8,12)==="WEBP";
                if(!isPng && !isJpg && !isWebp) {
                    fs.rmSync(file.path,{force:true});
                    continue;
                }
                accepted.push(path.relative(process.cwd(),file.path).split(path.sep).join("/"));
            }
            if(!accepted.length)
                return res.status(400).json({success:false,error:"유효한 jpg/png/webp 이미지가 없습니다."});
            const updated=saveCuratorProduct({
                ...saved,
                images:[...new Set([...(saved.images||[]),...accepted])].slice(0,12)
            });
            res.json({success:true,product:updated,imageCount:updated.images.length,
                note:"이미지 목록은 등록됐습니다. 쇼츠 제작 전 서로 다른 실제 이미지 2장 이상을 검사합니다."});
        } catch(error) {res.status(400).json({success:false,error:error.message});}
    }
);

app.delete("/curator/products/:id", (req, res) => {
    try {
        const ok = removeCuratorProduct(req.params.id);
        res.status(ok ? 200 : 404).json({ success:ok });
    } catch(error) { res.status(400).json({ success:false, error:error.message }); }
});
app.post("/curator/products/:id/enrich", async (req, res) => {
    try {
        const p = listCuratorProducts().find(x => x.id === req.params.id);
        if(!p) return res.status(404).json({ success:false, error:"상품 없음" });
        const product = await enrichCuratorProduct(p);
        res.json({ success:true, product, mediaReady:Boolean(product.images?.length) });
    } catch(error) { res.status(400).json({ success:false, error:error.message }); }
});
app.post("/curator/products/:id/create", async (req, res) => {
    try {
        if (BrainQueue.getStatus().running)
            return res.status(409).json({ success:false, error:"다른 제작 작업이 진행 중입니다." });
        const saved = listCuratorProducts().find(p => p.id === req.params.id && p.enabled !== false);
        if (!saved) return res.status(404).json({ success:false, error:"활성 상품이 없습니다." });
        const prepared = await prepareCuratorProduct(saved);
        const result = await BrainQueue.start({
            mode:"QUICK", topic:prepared.name, count:1,
            channel:"Shopping", product:prepared
        });
        const status = BrainQueue.getStatus();
        if(status.status !== "완료" || Number(status.current) < 1)
            throw new Error("큐레이터 쇼츠 제작 또는 업로드를 완료하지 못했습니다.");
        markCuratorPublished(saved);
        res.json({ success:true, result });
    } catch(error) { res.status(400).json({ success:false, error:error.message }); }
});

// Retired: never produce or refresh the old HOTDEAL video format.
app.use("/hotdeal", (req,res) => res.status(410).json({
    success:false,
    error:"핫딜 쇼츠는 종료됐습니다. 쿠팡 파트너스와 카카오 큐레이터를 사용하세요."
}));

// OAuth credentials stay local. Never expose secrets/tokens to browser or LAN.
// Only local PC browser can start auth and receive the callback.
function localOnly(req,res,next) {
    const address = String(req.socket.remoteAddress || "");
    if (!["127.0.0.1","::1","::ffff:127.0.0.1"].includes(address)) {
        return res.status(403).json({success:false,error:"인증 관리는 PC의 localhost에서만 가능합니다."});
    }
    next();
}
app.get("/api/instagram-auth/status",localOnly,(req,res)=>{
    res.set("Cache-Control","no-store");
    res.json({success:true,config:instagramConfigStatus(),accounts:getInstagramAuthStatuses()});
});
app.post("/api/instagram-auth/start",localOnly,(req,res)=>{
    try {
        const url=createAuthorizationUrl(req.body?.userId);
        res.json({success:true,url});
    } catch(error) {
        res.status(400).json({success:false,error:error.message});
    }
});
app.get("/api/instagram-auth/callback",localOnly,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try {
        if(req.query.error) throw new Error("Instagram 승인이 거부되었거나 취소되었습니다.");
        const account=await finalizeInstagramAuthorization(req.query);
        res.redirect("/?instagram_auth=success&account="+encodeURIComponent(account.username));
    } catch(error) {
        console.warn("[INSTAGRAM AUTH] callback:",error.message);
        res.redirect("/?instagram_auth=failed&reason="+encodeURIComponent(String(error.message).slice(0,180)));
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
        refreshInstagramTokens().catch(error=>console.error("[INSTAGRAM AUTH] Startup refresh:",error.message));
        setInterval(()=>refreshInstagramTokens().catch(error=>console.error("[INSTAGRAM AUTH] Scheduled refresh:",error.message)),24*60*60*1000).unref();

    }
);



