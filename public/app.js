async function createShorts(){

    const topic =
    document.getElementById("topic").value;


    const result =
    document.getElementById("result");


    if(!topic){

        result.innerHTML =
        "❌ 주제를 입력하세요";

        return;

    }



    result.innerHTML =
    `
    <div class="loading">
    ⏳ AI 쇼츠 생성 중...
    </div>
    `;



    try{


        const response =
        await fetch(
            "/create",
            {

                method:"POST",

                headers:{

                    "Content-Type":
                    "application/json"

                },


                body:
                JSON.stringify({

                    topic

                })

            }
        );



        const data =
        await response.json();



        if(data.error){


            result.innerHTML =
            `
            ❌ 오류 발생<br>
            ${data.error}
            `;


            return;

        }



        result.innerHTML =
        `
        ✅ 생성 완료<br><br>

        ${

            data.url ?

            `
            YouTube 주소:<br>
            <a href="${data.url}"
            target="_blank">
            ${data.url}
            </a>
            `

            :

            JSON.stringify(
                data,
                null,
                2
            )

        }

        `;



    }


    catch(error){


        result.innerHTML =
        `
        ❌ 서버 연결 실패<br>
        ${error.message}
        `;


    }


}

async function startBrain(){

const count = Number(

    document.getElementById(
        "brainCount"
    ).value

);

const categories = [

    ...document.querySelectorAll(
        ".brainCategory:checked"
    )

].map(x=>x.value);

await fetch(

    "/brain/start",

    {

        method:"POST",

        headers:{

            "Content-Type":
            "application/json"

        },

        body:JSON.stringify({

            mode:"AUTO",

            count,

            categories

        })

    }

);

updateBrainStatus();

}

async function stopBrain(){

    await fetch(

        "/brain/stop",

        {

            method:"POST"

        }

    );


    updateBrainStatus();

}

async function cancelBrain(){

    await fetch(

        "/brain/cancel",

        {

            method:"POST"

        }

    );

    updateBrainStatus();

}

async function updateBrainStatus(){

    try{

        const res = await fetch("/brain/status");

        const data = await res.json();

document.getElementById("brainProgressText").textContent =
`${data.current} / ${data.target} (${data.status})`;

const percent =
    data.target > 0
        ? (data.current / data.target) * 100
        : 0;

document.getElementById("brainProgressBar").style.width =
    percent + "%";

        document.getElementById(
            "brainCurrent"
        ).innerText =
            data.currentTopic;

        document.getElementById("brainList").innerHTML =
            data.list;

        /*
            =============================================
            BRAIN UI CONTROL

            HTML 실제 ID

            실행 : startBtn
            정지 : stopBtn
            취소 : cancelBtn
            =============================================
        */

        const startBtn =
            document.getElementById(
                "startBtn"
            );

        const stopBtn =
            document.getElementById(
                "stopBtn"
            );

        const cancelBtn =
            document.getElementById(
                "cancelBtn"
            );


        if (
            data.status === "제작중"
        ) {

            /*
                현재 제작 중

                실행 중복 금지
                정지 가능
                취소 가능
            */

            startBtn.disabled = true;

            stopBtn.disabled = false;

            cancelBtn.disabled = false;

        }
        else if (
            data.status === "정지중"
        ) {

            /*
                정지 요청 완료

                현재 쇼츠는 계속 제작 중
                새 실행/중복 정지는 막고
                취소는 가능
            */

            startBtn.disabled = true;

            stopBtn.disabled = true;

            cancelBtn.disabled = false;

        }
        else if (
            data.status === "정지"
        ) {

            /*
                정지 상태

                실행 버튼 = 재개
                정지 버튼 비활성
                취소 가능
            */

            startBtn.disabled = false;

            stopBtn.disabled = true;

            cancelBtn.disabled = false;

        }
        else if (
            data.status === "취소중"
        ) {

            /*
                현재 쇼츠 안전 종료 대기 중

                새 작업 / 정지 / 중복 취소 금지
            */

            startBtn.disabled = true;

            stopBtn.disabled = true;

            cancelBtn.disabled = true;

        }
        else {

            /*
                대기 / 완료 / 오류

                새로운 작업 시작 가능
            */

            startBtn.disabled = false;

            stopBtn.disabled = true;

            cancelBtn.disabled = true;

        }

    }catch(e){

        console.error(e);

    }

}

setInterval(

    updateBrainStatus,

    1000

);


/*
=========================================================
COUPANG MOBILE PRODUCT UI
=========================================================
*/


function escapeCoupangHtml(value){

    return String(
        value ?? ""
    )
    .replaceAll(
        "&",
        "&amp;"
    )
    .replaceAll(
        "<",
        "&lt;"
    )
    .replaceAll(
        ">",
        "&gt;"
    )
    .replaceAll(
        '"',
        "&quot;"
    )
    .replaceAll(
        "'",
        "&#039;"
    );

}



function setCoupangMessage(
    message,
    type = ""
){

    const el =
        document.getElementById(
            "coupangMessage"
        );


    if(!el){
        return;
    }


    el.className =
        "coupangMessage " +
        (
            type
                ? `coupangMessage-${type}`
                : ""
        );


    el.textContent =
        message || "";

}



function previewCoupangImages(){

    const input =
        document.getElementById(
            "coupangImages"
        );


    const preview =
        document.getElementById(
            "coupangImagePreview"
        );


    if(
        !input ||
        !preview
    ){
        return;
    }


    preview.innerHTML = "";


    const files =
        Array.from(
            input.files || []
        );


    for(const file of files){

        if(
            !file.type.startsWith(
                "image/"
            )
        ){
            continue;
        }


        const img =
            document.createElement(
                "img"
            );


        img.src =
            URL.createObjectURL(
                file
            );


        img.alt =
            "상품 이미지";


        img.onload = ()=>{

            URL.revokeObjectURL(
                img.src
            );

        };


        preview.appendChild(
            img
        );

    }

}



async function uploadCoupangImages(
    productId,
    files
){

    if(
        !files ||
        files.length === 0
    ){

        return null;

    }


    const form =
        new FormData();


    for(const file of files){

        form.append(
            "images",
            file
        );

    }


    const response =
        await fetch(
            `/coupang/products/${encodeURIComponent(productId)}/images`,
            {
                method:
                    "POST",

                body:
                    form
            }
        );


    const data =
        await response.json();


    if(
        !response.ok ||
        data.success === false
    ){

        throw new Error(
            data.error ||
            "상품 이미지 업로드 실패"
        );

    }


    return data;

}



async function addCoupangProduct(){

    const nameInput =
        document.getElementById(
            "coupangName"
        );


    const urlInput =
        document.getElementById(
            "coupangPartnerUrl"
        );


    const imageInput =
        document.getElementById(
            "coupangImages"
        );


    const button =
        document.getElementById(
            "coupangAddBtn"
        );


    const name =
        String(
            nameInput?.value || ""
        ).trim();


    const partnerUrl =
        String(
            urlInput?.value || ""
        ).trim();


    const files =
        Array.from(
            imageInput?.files || []
        );


    if(!name){

        setCoupangMessage(
            "상품명을 입력하세요.",
            "error"
        );

        return;

    }


    if(!partnerUrl){

        setCoupangMessage(
            "쿠팡 파트너스 링크를 입력하세요.",
            "error"
        );

        return;

    }


    if(files.length === 0){

        setCoupangMessage(
            "상품 사진을 1장 이상 선택하세요.",
            "error"
        );

        return;

    }


    try{

        button.disabled =
            true;


        setCoupangMessage(
            "상품 등록 중...",
            "working"
        );


        /*
        1. 상품 기본 정보 등록
        */

        const response =
            await fetch(
                "/coupang/products",
                {

                    method:
                        "POST",

                    headers:{
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            name,

                            keyword:
                                name,

                            partnerUrl,

                            enabled:
                                true

                        })

                }
            );


        const data =
            await response.json();


        if(
            !response.ok ||
            data.success === false
        ){

            throw new Error(
                data.error ||
                "상품 등록 실패"
            );

        }


        /*
        2. 선택한 사진 업로드
        */

        await uploadCoupangImages(
            data.product.id,
            files
        );


        setCoupangMessage(
            `등록 완료 · 사진 ${files.length}장`,
            "success"
        );


        nameInput.value = "";
        urlInput.value = "";
        imageInput.value = "";


        const preview =
            document.getElementById(
                "coupangImagePreview"
            );


        if(preview){

            preview.innerHTML = "";

        }


        await loadCoupangProducts();

    }
    catch(error){

        console.error(
            error
        );


        setCoupangMessage(
            error.message,
            "error"
        );

    }
    finally{

        button.disabled =
            false;

    }

}



async function createCoupangShort(
    productId,
    button
){

    try{

        if(button){

            button.disabled =
                true;

            button.textContent =
                "제작 요청 중...";

        }


        setCoupangMessage(
            "쿠팡 쇼츠 제작을 요청합니다...",
            "working"
        );


        const response =
            await fetch(
                `/coupang/products/${encodeURIComponent(productId)}/create`,
                {
                    method:
                        "POST"
                }
            );


        const data =
            await response.json();


        if(
            !response.ok ||
            data.success === false
        ){

            throw new Error(
                data.error ||
                "쇼츠 제작 요청 실패"
            );

        }


        setCoupangMessage(
            "쿠팡 쇼츠 제작을 시작했습니다.",
            "success"
        );

    }
    catch(error){

        setCoupangMessage(
            error.message,
            "error"
        );

    }
    finally{

        if(button){

            button.disabled =
                false;

            button.textContent =
                "▶ 쇼츠 만들기";

        }

    }

}



async function loadCoupangProducts(){

    const list =
        document.getElementById(
            "coupangProductList"
        );


    if(!list){
        return;
    }


    try{

        const response =
            await fetch(
                "/coupang/products"
            );


        const data =
            await response.json();


        if(
            !response.ok ||
            data.success === false
        ){

            throw new Error(
                data.error ||
                "상품 목록 불러오기 실패"
            );

        }


        const products =
            Array.isArray(
                data.products
            )
                ? data.products
                : [];


        if(products.length === 0){

            list.innerHTML =
                '<div class="coupangEmpty">등록된 상품이 없습니다.</div>';

            return;

        }


        list.innerHTML =
            products.map(
                product => {

                    const images =
                        Array.isArray(
                            product.images
                        )
                            ? product.images
                            : [];


                    const imageHtml =
                        images.length
                            ? `
                                <div class="coupangSavedImages">
                                    ${
                                        images.map(
                                            src =>
                                                `<img src="${escapeCoupangHtml(src)}" alt="상품 이미지">`
                                        ).join("")
                                    }
                                </div>
                            `
                            : `
                                <div class="coupangNoImage">
                                    등록 사진 없음
                                </div>
                            `;


                    return `
                        <div class="coupangProductItem">

                            ${imageHtml}

                            <div class="coupangProductName">
                                ${escapeCoupangHtml(product.name)}
                            </div>

                            <div class="coupangProductInfo">
                                사진 ${images.length}장
                            </div>

                            <a
                                class="coupangLink"
                                href="${escapeCoupangHtml(product.partnerUrl)}"
                                target="_blank"
                                rel="noopener noreferrer">

                                파트너스 링크 열기

                            </a>

                            <button
                                type="button"
                                class="coupangCreateBtn"
                                onclick="createCoupangShort('${escapeCoupangHtml(product.id)}',this)">

                                ▶ 쇼츠 만들기

                            </button>

                            <button
                                type="button"
                                class="coupangDeleteBtn"
                                onclick="deleteCoupangProduct(
                                    '${escapeCoupangHtml(product.id)}',
                                    '${escapeCoupangHtml(product.name).replace(/'/g, "&#39;")}',
                                    this
                                )">

                                🗑 상품 삭제

                            </button>

                        </div>
                    `;

                }

            ).join("");

    }
    catch(error){

        console.error(
            error
        );


        list.innerHTML =
            `
            <div class="coupangError">
                ${escapeCoupangHtml(error.message)}
            </div>
            `;

    }

}



document.addEventListener(
    "DOMContentLoaded",
    ()=>{

        const input =
            document.getElementById(
                "coupangImages"
            );


        if(input){

            input.addEventListener(
                "change",
                previewCoupangImages
            );

        }


        loadCoupangProducts();

    }
);



async function deleteCoupangProduct(
    productId,
    productName,
    button
){

    const ok =
        confirm(
            `"${productName}" 상품을 삭제하시겠습니까?\n\n등록된 상품 사진도 함께 삭제됩니다.`
        );


    if(!ok){
        return;
    }


    const originalText =
        button
            ? button.textContent
            : "🗑 상품 삭제";


    try{

        if(button){

            button.disabled = true;

            button.textContent =
                "삭제 중...";

        }


        const response =
            await fetch(
                `/coupang/products/${encodeURIComponent(productId)}`,
                {
                    method:"DELETE"
                }
            );


        const data =
            await response.json();


        if(
            !response.ok ||
            data.success === false
        ){

            throw new Error(
                data.error ||
                "상품 삭제 실패"
            );

        }


        setCoupangMessage(
            "상품이 삭제되었습니다.",
            "success"
        );


        await loadCoupangProducts();

    }
    catch(error){

        console.error(
            error
        );


        setCoupangMessage(
            error.message,
            "error"
        );


        if(button){

            button.disabled = false;

            button.textContent =
                originalText;

        }

    }

}

