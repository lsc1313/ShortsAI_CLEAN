
import { planVideo } from "./videoPlanner.js";
import {
    debug
} from "../logger.js";

export function buildPrompt(topic){

    const blueprint = planVideo(topic);

debug(blueprint);

    return `
너는 조회수 100만 이상의 유튜브 쇼츠 전문 작가다.

=========================
VIDEO
=========================

주제
${topic}

videoType
${blueprint.videoType}

globalSubject
${blueprint.globalSubject}

sceneStrategy
${blueprint.sceneStrategy}

=========================
OUTPUT
=========================

반드시 JSON만 출력한다.

{
  "title":"",
  "videoType":"",
  "globalSubject":"",
  "sceneStrategy":"",
  "hook":"",
  "scenes":[
    {
      "role":"",
      "sceneSubject":"",
      "searchName":"",
      "searchSubject":"",
      "category":"",
      "focus":"",
      "action":"",
      "title":"",
      "voice":"",
      "subtitle":"",
      "images":[
        "",
        "",
        "",
        ""
      ]
    }
  ],
  "ending":""
}

=========================
COMMON RULE
=========================

- Hook은 1문장이다.
- Hook은 scenes에 포함하지 않는다.
- voice와 subtitle은 동일하다.
- 모든 Scene은 새로운 정보를 말한다.
- 같은 내용을 반복하지 않는다.
- globalSubject를 절대 벗어나지 않는다.
- Scene은 8~10개 작성한다.
- JSON 외에는 아무것도 출력하지 않는다.

=========================
RANKING RULE
=========================

ranking 영상이면 반드시 아래 순서를 따른다.

Hook

↓

5위

↓

4위

↓

3위

↓

2위

↓

1위

↓

추가정보(선택)

↓

Outro

금지

- TOP5 소개
- 이번 영상
- 지금부터
- 먼저 알아보자
- 순위 소개

Hook에서 이미 소개했으므로
바로 5위부터 시작한다.

Ranking Scene 제목은 반드시

5위
4위
3위
2위
1위

중 하나로 시작한다.

=========================
SEARCH RULE
=========================

searchName은

실제 사진 사이트에서 검색 가능한
대표 영어명이다.

동음이의어는
반드시 globalSubject 기준으로 선택한다.

예)

고양이

Sphinx
→ Sphynx Cat

Persian
→ Persian Cat

꽃

Rose
→ Rose Flower

자동차

Jaguar
→ Jaguar Car

동물

Jaguar
→ Jaguar Animal

=========================
IMAGE RULE
=========================

images는 영어 검색어이다.

반드시

searchName

기반으로 생성한다.

Scene 하나에는

하나의 대상만 존재한다.

좋은 예

Border Collie portrait

Border Collie running

Border Collie close up

Border Collie puppy

나쁜 예

Border Collie

Dog

Pet

Animal

처럼 다른 대상을 섞으면 안 된다.

images는

같은 대상의

다른 구도

다른 거리

다른 행동

으로 생성한다.

=========================
IMPORTANT
=========================

searchName
↓

imageQueries 생성

순서로 사고한다.

imageQueries를 먼저 만들지 않는다.

searchName이 애매하면
globalSubject를 기준으로 결정한다.

JSON만 출력한다.
`;

}

export function buildTopicPrompt(input = 100) {

    if (Array.isArray(input)) {

        const news = input
            .map(item => `- ${item.title}`)
            .join("\n");

        return `
너는 조회수 100만 이상의 유튜브 쇼츠 기획자다.

아래 최신 뉴스를 보고
쇼츠 제목만 만들어라.

조건

- 20~35자
- 클릭하고 싶은 제목
- 과장 금지
- 번호 금지
- JSON 배열만 출력

뉴스

${news}

{
  "topics":[
    "",
    "",
    ""
  ]
}
`;
    }

    return `
너는 유튜브 조회수 분석 전문가다.

목표

조회수가 높을 가능성이 있는
유튜브 쇼츠 주제 ${input}개를 만든다.

조건

- 한국 유튜브 기준
- 최근 트렌드 반영
- 시즌 반영
- 중복 금지
- TOP5
- 비교
- 비밀
- 역사
- 과학
- 동물
- 자동차
- 음식
- 여행
- 인물
- AI
- 생활정보

를 적절히 섞는다.

JSON만 출력

{
  "topics":[
    "",
    "",
    ""
  ]
}
`;
}


/*
=========================================================
COUPANG SHOPPING SHORTS PROMPT
=========================================================

쿠팡 상품 QUICK 제작 전용.

일반 buildPrompt()는 절대 변경하지 않는다.

목표

- 상품 자체를 중심으로 대본 작성
- 제품의 확인되지 않은 성능/효과를 지어내지 않음
- 상품명과 keyword 범위 안에서 작성
- 등록 상품 이미지는 createShort.js에서 별도 주입
- 파트너스 URL은 AI에게 전달하지 않음
=========================================================
*/


export function buildShoppingPrompt(
    topic,
    product = {}
){

    /*
    =====================================================
    PRODUCT IDENTITY
    =====================================================
    */

    const productName =
        String(
            product?.productTitle ||
            product?.name ||
            product?.storedName ||
            topic ||
            ""
        ).trim();


    const storedName =
        String(
            product?.storedName ||
            product?.name ||
            ""
        ).trim();


    const keyword =
        String(
            product?.keyword ||
            storedName ||
            productName
        ).trim();


    /*
    =====================================================
    VERIFIED PRODUCT DATA

    Resolver에서 실제 확인된 값만
    Shopping AI에게 전달한다.

    시스템 내부용 값은 전달하지 않는다.
    =====================================================
    */

    const verified = [];


    const addVerified = (
        label,
        value
    ) => {

        if(
            value === undefined ||
            value === null ||
            value === ""
        ){
            return;
        }

        const normalized =
            String(value).trim();

        if(!normalized){
            return;
        }

        verified.push(
            `${label}: ${normalized}`
        );

    };


    addVerified(
        "실제 상품명",
        product?.productTitle
    );


    addVerified(
        "판매가",
        product?.price
    );


    addVerified(
        "정상가",
        product?.originalPrice
    );


    addVerified(
        "할인율",
        product?.discountRate
    );


    addVerified(
        "단위가격",
        product?.unitPrice
    );


    const rating =
        Number(product?.rating);

    if(
        product?.rating !== null &&
        product?.rating !== undefined &&
        product?.rating !== "" &&
        Number.isFinite(rating)
    ){
        addVerified(
            "평점",
            rating
        );
    }


    addVerified(
        "리뷰 수",
        product?.actualReviewCount ||
        product?.reviewCount
    );


    addVerified(
        "배송 정보",
        product?.delivery
    );


    if(
        product?.rocketDelivery === true
    ){
        addVerified(
            "로켓배송",
            "가능"
        );
    }


    if(
        product?.rocketDelivery === false
    ){
        addVerified(
            "로켓배송",
            "아님"
        );
    }


    addVerified(
        "브랜드",
        product?.brandName
    );


    if(
        product?.soldOut === true
    ){
        addVerified(
            "판매 상태",
            "품절"
        );
    }


    if(
        product?.soldOut === false
    ){
        addVerified(
            "판매 상태",
            "판매 가능"
        );
    }


    /*
    =====================================================
    PRODUCT ATTRIBUTES
    =====================================================
    */

    if(
        Array.isArray(
            product?.attributes
        )
    ){

        for(
            const attribute
            of product.attributes
        ){

            if(
                !attribute ||
                !attribute.type ||
                !attribute.value
            ){
                continue;
            }

            addVerified(
                String(
                    attribute.type
                ).trim(),
                attribute.value
            );

        }

    }


    const verifiedProductInfo =
        verified.length > 0
            ? verified
                .map(
                    item => `- ${item}`
                )
                .join("\n")
            : "- 추가 확인된 상세 상품 정보 없음";


    return `
너는 유튜브 쇼핑 쇼츠 전문 작가다.

=========================
SHOPPING PRODUCT
=========================

상품명
${productName}

상품 키워드
${keyword}

=========================
VERIFIED PRODUCT DATA
=========================

아래 정보는 시스템이
실제 상품 페이지에서 확인한 정보다.

${verifiedProductInfo}

이 영역에 존재하는 정보만
구체적인 상품 사실로 사용할 수 있다.

제공되지 않은 상품 정보는
추측하거나 만들어내지 않는다.

=========================
VIDEO PURPOSE
=========================

이 영상은 위 실제 상품을 소개하는
짧고 자연스러운 쇼핑 쇼츠다.

일반 상식 영상이 아니다.

상품과 직접 관련된 내용만 작성한다.

시청자가

왜 이 상품에 관심을 가질 수 있는지,
어떤 상황에서 사용할 수 있는지,
어떤 사람에게 유용할 수 있는지

쉽게 이해하도록 작성한다.

VERIFIED PRODUCT DATA에
구체적인 상품 정보가 있다면
대본에 자연스럽게 활용한다.

상품 정보를
단순 목록처럼 읽지 않는다.

=========================
FACT SAFETY RULE
=========================

VERIFIED PRODUCT DATA에 없는 정보를
사실처럼 만들어내지 않는다.

특히 다음 정보는
제공된 경우에만 말한다.

가격
정상가
할인율
단위가격
평점
리뷰 수
옵션
구성
수량
재질
크기
성분
인증
배송
로켓배송
브랜드
성능
효능
효과

상품명만 보고
성능이나 효과를 추론하지 않는다.

상품 키워드는
영상 주제 범위를 정하기 위한 정보다.

상품 키워드 자체를
검증된 상품 사양으로 취급하지 않는다.

=========================
HOOK RULE
=========================

Hook은 1문장이다.

상품에 관심을 갖게 만드는
짧고 자연스러운 문장으로 작성한다.

확인된 상품 특징이 있다면
Hook에 자연스럽게 활용할 수 있다.

과도한 광고 문구는 사용하지 않는다.

금지 예:

무조건 사세요
역대급
최저가
1위 제품
품절 대란
100% 효과
무조건 추천

근거 없는 표현을 사용하지 않는다.

=========================
SCENE RULE
=========================

Scene은 5~7개 작성한다.

Hook은 scenes에 포함하지 않는다.

각 Scene은 새로운 내용을 말한다.

같은 내용을 반복하지 않는다.

voice와 subtitle은 동일하다.

각 Scene은 짧고
쇼츠 음성에 자연스럽게 작성한다.

가능하면 다음 흐름을 사용한다.

1. 상품 소개
2. 확인된 핵심 특징
3. 사용 상황
4. 생활 속 활용
5. 선택 시 참고할 정보
6. 자연스러운 마무리

확인되지 않은 특징을
Scene을 채우기 위해 만들어내지 않는다.

=========================
VERIFIED DATA USAGE
=========================

가격이 제공된 경우에만
가격을 말할 수 있다.

할인율이 제공된 경우에만
할인을 말할 수 있다.

평점이 제공된 경우에만
평점을 말할 수 있다.

리뷰 수가 제공된 경우에만
리뷰 수를 말할 수 있다.

배송 정보가 제공된 경우에만
배송을 말할 수 있다.

로켓배송 정보가 제공된 경우에만
로켓배송 여부를 말할 수 있다.

브랜드가 제공된 경우에만
브랜드를 말할 수 있다.

상품 속성이 제공된 경우에만
해당 속성을 상품 사실로 사용할 수 있다.

품절 상태라면
구매를 강하게 유도하지 않는다.

=========================
VIDEO TYPE
=========================

videoType은 반드시

single

이다.

sceneStrategy는 반드시

global

이다.

globalSubject는 반드시

${productName}

이다.

=========================
IMAGE RULE
=========================

실제 영상 이미지는
사용자가 등록한 상품 이미지를 사용한다.

AI가 생성하는 images 값은
영상 제작에 사용되지 않는다.

기존 JSON 구조 호환성을 위해
images는 배열 형태로 유지한다.

각 Scene의 대상은
동일 상품

${productName}

을 유지한다.

=========================
ENDING RULE
=========================

ending은 자연스럽게 마무리한다.

구독 또는 좋아요 문구를
짧게 포함할 수 있다.

구매 링크를 AI가 생성하지 않는다.

URL을 출력하지 않는다.

쿠팡 파트너스 고지문을
AI가 생성하지 않는다.

링크와 고지문은
시스템 metadata 단계에서 처리한다.

=========================
OUTPUT
=========================

반드시 JSON만 출력한다.

{
  "title":"",
  "videoType":"single",
  "globalSubject":"${productName}",
  "sceneStrategy":"global",
  "hook":"",
  "scenes":[
    {
      "role":"",
      "sceneSubject":"${productName}",
      "searchName":"${productName}",
      "searchSubject":"${productName}",
      "category":"shopping",
      "focus":"",
      "action":"",
      "title":"",
      "voice":"",
      "subtitle":"",
      "images":[]
    }
  ],
  "ending":""
}

=========================
FINAL RULE
=========================

JSON 외에는 아무것도 출력하지 않는다.

VERIFIED PRODUCT DATA에 없는
구체적인 상품 사실을 만들어내지 않는다.

확인된 상품 정보는
단순 나열하지 말고
자연스러운 쇼츠 대본에 활용한다.

일반 정보 쇼츠가 아니라
반드시 실제 상품 소개 쇼츠로 작성한다.
`;

}

