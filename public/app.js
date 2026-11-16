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


function syncBrainContentType(){

    const type =
        document.getElementById(
            "brainContentType"
        )?.value || "SHORTS";

    const countInput =
        document.getElementById(
            "brainCount"
        );

    const categories =
        document.querySelectorAll(
            ".brainCategory"
        );

    const longform =
        type === "LONGFORM";

    if (countInput) {

        countInput.disabled =
            longform;

        if (longform) {
            countInput.value = "1";
        }

    }

    categories.forEach(
        item => {
            item.disabled =
                longform;
        }
    );

}

async function startBrain(){

    const contentType =
        document.getElementById(
            "brainContentType"
        )?.value || "SHORTS";

    const isLongform =
        contentType === "LONGFORM";

    const count =
        isLongform
            ? 1
            : Number(
                document.getElementById(
                    "brainCount"
                ).value
            );

    const categories =
        isLongform
            ? ["history"]
            : [
                ...document.querySelectorAll(
                    ".brainCategory:checked"
                )
            ].map(x => x.value);

    const response = await fetch(
        "/brain/start",
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                mode: "AUTO",
                type: contentType,
                count,
                categories
            })
        }
    );

    if (!response.ok) {
        console.error(
            "BRAIN START FAILED",
            await response.text()
        );
    }

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


/* Kakao curator registry; issued affiliate links must remain unchanged. */
(function initCuratorUI() {
  const form = document.getElementById("curatorForm");
  const list = document.getElementById("curatorList");
  const status = document.getElementById("curatorStatus");
  if (!form || !list || !status) return;
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const request = async (url, method = "GET", body) => {
    const r = await fetch(url, {
      method, headers: { "Content-Type":"application/json" },
      ...(body === undefined ? {} : {body:JSON.stringify(body)})
    });
    const data = await r.json();
    if (!r.ok || data.success === false) throw Error(data.error || "요청 실패");
    return data;
  };
  const refresh = async () => {
    try {
      const {products} = await request("/curator/products");
      list.innerHTML = products.length ? products.map(p => `
        <article style="padding:12px;background:#101820;border-radius:10px">
          <strong>${escape(p.name)}</strong>
          <p style="font-size:12px;word-break:break-all">${escape(p.partnerUrl)}</p>
          <p>등록된 이미지 주소: ${p.images?.length || 0}장 · 쇼츠 제작에는 실제로 열리는 서로 다른 사진 2장 이상 필요</p>
          <label style="display:block;margin:8px 0">휴대폰 갤러리에서 실제 상품 사진 추가
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" data-curator-files="${escape(p.id)}" style="display:block;width:100%;padding:8px 0">
          </label>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button type="button" data-curator-action="upload" data-id="${escape(p.id)}">선택한 사진 등록</button>
            <button type="button" data-curator-action="enrich" data-id="${escape(p.id)}">이미지 자동 확인</button>
            <button type="button" data-curator-action="create" data-id="${escape(p.id)}">지금 쇼츠 제작</button>
            <button type="button" data-curator-action="remove" data-id="${escape(p.id)}">삭제</button>
          </div>
        </article>`).join("") : "<p>등록된 상품이 없습니다.</p>";
    } catch (e) { status.textContent = e.message; }
  };
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const name = document.getElementById("curatorName").value.trim();
    const partnerUrl = document.getElementById("curatorLink").value.trim();
    const images = document.getElementById("curatorImages").value
      .split(/\n+/).map(x => x.trim()).filter(Boolean);
    try {
      const registered=await request("/curator/products","POST",{name,partnerUrl,images});
      status.textContent = registered.mediaReady ? "상품 이미지·정보 자동 수집 완료" : "링크는 등록됐지만 공개 상품정보가 제한되어 추가 이미지/상품명이 필요합니다.";
      form.reset(); await refresh();
    } catch (e) { status.textContent = e.message; }
  });
  list.addEventListener("click", async e => {
    const btn = e.target.closest("[data-curator-action]");
    if (!btn) return;
    const id = encodeURIComponent(btn.dataset.id);
    const action = btn.dataset.curatorAction;
    btn.disabled = true;
    try {
      if (action === "remove") {
        if (!confirm("이 큐레이터 상품을 삭제할까요?")) return;
        await request("/curator/products/" + id,"DELETE");
        status.textContent = "삭제 완료";
      } else if (action === "upload") {
        const fileInput = [...list.querySelectorAll("[data-curator-files]")]
          .find(el => el.dataset.curatorFiles === btn.dataset.id);
        if (!fileInput?.files?.length) throw Error("갤러리에서 상품 사진을 2장 이상 선택하세요.");
        const formData = new FormData();
        for (const file of fileInput.files) formData.append("images",file);
        const response = await fetch("/curator/products/" + id + "/images",{method:"POST",body:formData});
        const result = await response.json();
        if (!response.ok || !result.success) throw Error(result.error || "사진 등록 실패");
        status.textContent = "상품 사진 " + result.imageCount + "장 등록됨. 제작 시 실제 사진 중복 검사를 진행합니다.";
      } else if (action === "enrich") {
        const result = await request("/curator/products/" + id + "/enrich","POST");
        status.textContent = result.mediaReady ? "등록 이미지가 있습니다. 서로 다른 사진 2장 이상이 확보되는지는 제작 시 검사합니다." : "카카오 공개 페이지에서 추가 이미지를 찾지 못했습니다. 휴대폰 갤러리에서 실제 상품 사진을 추가할 수 있습니다.";
      } else if (action === "create") {
        status.textContent = "쇼츠 제작 중입니다.";
        await request("/curator/products/" + id + "/create","POST");
        status.textContent = "쇼츠 제작 및 업로드 완료";
      }
      await refresh();
    } catch (error) { status.textContent = error.message; }
    finally { btn.disabled = false; }
  });
  refresh();
})();




/*
=========================================================
SHOPPING QUICK CREATE
상품명 → Coupang → Shopping 제작
=========================================================
*/
async function createShoppingByProductName() {

    const input =
        document.getElementById(
            "brainShoppingProductName"
        );

    const button =
        document.getElementById(
            "brainShoppingCreateBtn"
        );

    const productName =
        String(input?.value || "").trim();

    if (!productName) {

        alert("제작할 상품명을 입력해주세요.");

        input?.focus();

        return;

    }

    if (button) {
        button.disabled = true;
        button.textContent = "⏳ 제작 시작 중...";
    }

    try {

        const response =
            await fetch(
                "/shopping/create",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        productName
                    })
                }
            );

        const result =
            await response.json();

        if (
            !response.ok ||
            result?.success === false
        ) {

            throw new Error(
                result?.error ||
                "쇼핑 제작 시작 실패"
            );

        }

        console.log(
            "[SHOPPING QUICK]",
            result
        );

        alert(
            `쇼핑 제작을 시작했습니다.\n\n상품: ${productName}`
        );

    }
    catch (error) {

        console.error(
            "[SHOPPING QUICK ERROR]",
            error
        );

        alert(
            `쇼핑 제작 실패\n${error.message}`
        );

    }
    finally {

        if (button) {
            button.disabled = false;
            button.textContent = "🛒 쇼핑 제작";
        }

    }

}


window.createShoppingByProductName =
    createShoppingByProductName;

async function loadSchedulerStatus() {

    const overall =
        document.getElementById(
            "schedulerOverall"
        );

    const jobsBox =
        document.getElementById(
            "schedulerJobs"
        );

    const errorBox =
        document.getElementById(
            "schedulerError"
        );

    if (
        !overall ||
        !jobsBox ||
        !errorBox
    ) {
        return;
    }

    try {

        const response =
            await fetch(
                "/api/scheduler/status",
                {
                    cache:
                        "no-store"
                }
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            data?.success === false
        ) {

            throw new Error(
                data?.error ||
                "스케줄러 상태 조회 실패"
            );

        }


        /*
        전체 상태
        */

        if (data.running) {

            overall.textContent =
                data.currentJob
                    ? `실행 중 · ${data.currentJob}`
                    : "실행 중";

        }
        else {

            overall.textContent =
                "대기 중";

        }


        /*
        작업별 표시명
        */

        const labels = {

            "ai":
                "🤖 AI",

            "science":
                "🔬 Science",

            "shopping-recommendation":
                "🛍️ 쿠팡 파트너스",

            "history":
                "🏛️ History",

            "animal":
                "🐾 Animal",

            "kakao-curator":
                "🎁 카카오 큐레이터"

        };


        const statusLabels = {

            skipped:
                "상품 이미지/신규 링크 부족으로 건너뜀",

            waiting:
                "대기",

            running:
                "실행 중",

            completed:
                "완료",

            "pending-recovery":
                "예약 시간 지남",

            missed:
                "PC 미실행 · 예약 놓침",

            failed:
                "제작 실패 · 자동 재실행 없음",

            interrupted:
                "중단됨 · 자동 재실행 없음"

        };


        const rows =
            Array.isArray(data.jobs)
                ? data.jobs.map(job => {

                    const label =
                        labels[job.id] ||
                        job.channel ||
                        job.id;

                    const statusText =
                        statusLabels[job.status] ||
                        job.status;

let displayStatus =
    statusText;

if (
    job.status === "completed" &&
    job.completedCount !== null &&
    job.completedCount !== undefined
) {

    displayStatus =
        `${statusText} ${job.completedCount}/${job.targetCount}`;

}

                    return `
                        <div class="schedulerJob scheduler-${job.status}">
                            <span class="schedulerTime">
                                ${job.time}
                            </span>

                            <span class="schedulerName">
                                ${label}
                                ${job.count > 1
                                    ? `× ${job.count}`
                                    : ""}
                            </span>

<span class="schedulerStatus">
    ${displayStatus}
</span>
                        </div>
                    `;

                }).join("")
                : "";


        jobsBox.innerHTML =
            rows ||
            "예약 작업이 없습니다.";


        /*
        최근 오류
        */

        if (data.lastError) {

            errorBox.innerHTML = `
                <div class="schedulerLastError">
                    ⚠️ 최근 오류:
                    ${data.lastError.jobId || ""}
                    ·
                    ${data.lastError.message || ""}
                </div>
            `;

        }
        else {

            errorBox.innerHTML =
                "";

        }

    }
    catch (error) {

        overall.textContent =
            "연결 오류";

        jobsBox.innerHTML =
            "PC 자동화 상태를 불러오지 못했습니다.";

        errorBox.innerHTML = `
            <div class="schedulerLastError">
                ${error?.message || error}
            </div>
        `;

    }

}


window.addEventListener(
    "DOMContentLoaded",
    () => {

        loadSchedulerStatus();

        setInterval(
            loadSchedulerStatus,
            30000
        );

    }
);