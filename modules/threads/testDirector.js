import { createThreadsDirector } from "./director.js";

async function run() {

    /*
     * 실제 SHOPPING QUICK product 구조와 동일하게 테스트
     */
    const product = {
        id: "threads_test",
        name: "갤럭시 Z 폴드8 케이스",
        keyword: "갤럭시 Z 폴드8 케이스",
        description: "",
        price: 0,
        partnerUrl: "",
        images: [],
        enabled: true
    };

    const shoppingDirector = {
        title: "고속충전 대용량 보조배터리",
        summary: "상품명에 실제로 포함된 정보를 바탕으로 쇼핑 콘텐츠를 구성한다."
    };

    const result =
        await createThreadsDirector({
            product,
            shoppingDirector,
            metadata: null
        });

    console.log("");
    console.log("===== THREADS TEST RESULT =====");
    console.log(result);
    console.log("===============================");

}

run().catch(error => {

    console.error(
        "[THREADS DIRECTOR TEST ERROR]",
        error
    );

    process.exit(1);

});
