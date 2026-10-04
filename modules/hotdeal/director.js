import { callAI } from "../ai/index.js";
import { createHotdealCards } from "./card.js";

/*
 * HOTDEAL DIRECTOR
 *
 * 입력:
 *   today-products.json의 products 배열
 *
 * 처리:
 *
 *   상품정보
 *      ↓
 *   상품 카드 생성
 *      ↓
 *   카드 파일 + 구조화된 상품정보
 *      ↓
 *   HOTDEAL DIRECTOR
 *      ↓
 *   영상 연출 결정
 *
 * 주의:
 *   - Director는 이미지를 검색하지 않는다.
 *   - 기존 IMAGE ENGINE을 호출하지 않는다.
 *   - 가격/상품 원본정보를 변경하지 않는다.
 *   - cardFile은 이후 VIDEO 단계에서 사용할 실제 카드 파일이다.
 */

export async function createHotdealDirector(products = [], cards = []) {

  console.log("[HOTDEAL DIRECTOR] START");

  if (
    !Array.isArray(products) ||
    products.length === 0
  ) {

    throw new Error(
      "HOTDEAL DIRECTOR: 상품 데이터가 없습니다."
    );

  }


  /*
   * =====================================================
   * 1. 원본 상품정보 고정
   * =====================================================
   *
   * Director가 가격 등을 임의로 바꾸지 못하도록
   * 원본 데이터를 먼저 고정한다.
   */

  const sourceProducts =
    products.map(
      (product, index) => ({

        order:
          index + 1,

        productGroup:
          product.productGroup,

        name:
          product.name,

        price:
          product.price,

        unitPrice:
          product.unitPrice,

        unitLabel:
          product.unitLabel,

        highestPrice:
          product.highestPrice,

        dealRate:
          product.dealRate,

        isHotdeal:
          product.isHotdeal,

        sevenDayLow:
          product.sevenDayLow,

        sevenDayStatus:
          product.sevenDayStatus,

        thirtyDayLow:
          product.thirtyDayLow,

        thirtyDayStatus:
          product.thirtyDayStatus,

        image:
          product.image,

        url:
          product.url

      })
    );


  /*
   * =====================================================
   * 2. NEW HOTDEAL PRODUCT CARD
   * =====================================================
   *
   * 상품정보를 이용해
   * 실제 세로형 상품 카드를 먼저 만든다.
   *
   * 기존 IMAGE ENGINE을 사용하지 않는다.
   */

  console.log(
    "[HOTDEAL CARD] 상품 카드 생성 시작"
  );

  // cards 매개변수 직접 사용

  if (
    !Array.isArray(cards) ||
    cards.length !== sourceProducts.length
  ) {

    throw new Error(
      `HOTDEAL CARD 무결성 오류 : ` +
      `PRODUCT ${sourceProducts.length} / ` +
      `CARD ${cards?.length || 0}`
    );

  }

  console.log(
    `[HOTDEAL CARD] ${cards.length}장 생성 완료`
  );


  /*
   * =====================================================
   * 3. CARD + PRODUCT INFORMATION
   * =====================================================
   *
   * Director가 판단할 데이터.
   *
   * 카드 이미지를 AI에게 분석시키는 것이 아니다.
   *
   * 카드에 들어가는 정보와
   * 원본 상품정보를 구조화해서 전달한다.
   */

  const directorProducts =
    sourceProducts.map(
      (source, index) => ({

        order:
          source.order,

        productGroup:
          source.productGroup,

        name:
          source.name,

        price:
          source.price,

        unitPrice:
          source.unitPrice,

        unitLabel:
          source.unitLabel,

        highestPrice:
          source.highestPrice,

        dealRate:
          source.dealRate,

        isHotdeal:
          source.isHotdeal,

        sevenDayLow:
          source.sevenDayLow,

        sevenDayStatus:
          source.sevenDayStatus,

        thirtyDayLow:
          source.thirtyDayLow,

        thirtyDayStatus:
          source.thirtyDayStatus,

        /*
         * 카드가 실제로 생성되었는지만
         * Director가 알 수 있도록 한다.
         */
        cardReady:
          Boolean(
            cards[index]?.cardFile
          )

      })
    );


  /*
   * =====================================================
   * 4. HOTDEAL DIRECTOR PROMPT
   * =====================================================
   */

  const prompt = `
너는 YouTube Shorts 가격비교 콘텐츠를 전문으로 만드는
HOTDEAL DIRECTOR다.

이번 영상은 일반적인 상품소개 쇼츠가 아니다.

"오늘의 생필품 가격비교"를 보여주는
세로형 9:16 가격비교 쇼츠다.

상품마다 이미 세로형 상품 카드가 생성되어 있다.

Director는 상품 이미지를 검색하거나
새로운 이미지를 만들지 않는다.

Director가 판단해야 하는 것은
이미 만들어진 상품 카드들을
영상에서 어떻게 보여줄 것인가이다.

영상은 약 35초다.

핵심 연출:

세로형 상품 카드
↓
첫 카드에서 시작
↓
상품 카드를 순서대로 보여줌
↓
상품이 화면에 들어올 때
상품군 + 단위가격 + 가격정보를 짧게 전달
↓
필요하면 HOT DEAL 강조
↓
마지막 프로필 CTA

반드시 지켜라.

1. 화면 비율

9:16 세로형.

2. 상품 카드

각 상품의 카드가 이미 생성되어 있다.

Director는 카드를 새로 만들지 않는다.

Director는 상품 이미지를 검색하지 않는다.

imageQueries를 만들지 않는다.

3. 상품 데이터

다음 값은 절대로 수정하지 않는다.

- price
- unitPrice
- unitLabel
- highestPrice
- dealRate
- isHotdeal
- sevenDayLow
- sevenDayStatus
- thirtyDayLow
- thirtyDayStatus

가격을 추측하거나 계산해서 변경하지 않는다.

4. 가격 의미와 7일 / 30일 비교

price는 현재 상품의 실제 총 구매가격이다.

unitPrice는 상품군 전체 비교를 위해 정규화된 현재 단위가격이다.
sevenDayLow와 thirtyDayLow도 총 구매가격이 아니라
같은 productGroup 전체 상품의 정규화 단위가격 최저값이다.
브랜드는 구분하지 않는다.

unitLabel 기준으로 반드시 함께 읽는다.
예: unitLabel이 "롤"이면 "롤당 630원", "매"이면 "매당 12원",
"ml"이면 "밀리리터당 1원", "g"이면 "그램당 20원"처럼 표현한다.

원화 가격에는 소수점을 만들거나 읽지 않는다.
663.00원 같은 표현을 만들지 말고 663원으로 표현한다.

값이 null이고 status가 "수집중"이면
반드시 "수집중"이라고 표시한다.

절대로 없는 가격을 만들어내지 않는다.

5. HOT DEAL

isHotdeal이 true인 상품만
HOT DEAL을 강조한다.

false이면 HOT DEAL을 표시하지 않는다.

6. 할인율

dealRate가 제공되고 0보다 큰 경우에만
할인율을 말하거나 표시한다.

7. 상품 순서

입력 order 순서를 기본적으로 유지한다.

상품의 order 자체를 변경하지 않는다.

8. 영상 길이

전체 영상은 약 35초다.

상품 수가 많으므로
각 상품 설명은 짧게 한다.

9. 나레이션

각 상품에서는 필요한 정보만 짧게 말한다.

우선순위:

상품군
현재 단위가격(unitLabel 포함)
상품군 전체 7일 최저 단위가격 상태
상품군 전체 30일 최저 단위가격 상태
HOT DEAL인 경우 할인율

10. Hook

첫 부분은 짧고 강하게 만든다.

예:

"오늘 생필품 가격, 한눈에 비교해보겠습니다."

11. 카드 이동

카드가 위에서 아래 방향으로
순서대로 등장하도록 연출한다.

필요한 경우 다음 값을 결정한다.

scrollStart
scrollEnd
scrollDuration
scrollSpeed

12. Director의 역할

Director는 다음을 결정한다.

- 상품 표시 순서
- 상품별 표시 시간
- 카드 이동 방식
- 카드 강조 방식
- TTS
- 자막
- HOT DEAL 강조 여부
- 마지막 CTA

Director는 카드 자체를 생성하지 않는다.

반드시 JSON만 출력한다.

다음 형식을 사용한다.

{
  "title": "",
  "description": "",
  "format": {
    "aspectRatio": "9:16",
    "orientation": "vertical"
  },
  "video": {
    "targetDuration": 35,
    "layout": "vertical_product_cards",
    "scrollDirection": "top_to_bottom",
    "scrollMode": "continuous"
  },
  "hook": {
    "tts": "",
    "subtitle": "",
    "duration": 2.5
  },
  "products": [
    {
      "order": 1,
      "productGroup": "",
      "displayDuration": 2.5,
      "scrollDuration": 2.5,
      "scrollSpeed": "slow",
      "tts": "",
      "subtitle": "",
      "showHotdeal": false
    }
  ],
  "ending": {
    "tts": "",
    "subtitle": "",
    "duration": 2.5
  }
}

상품 배열에는 입력 상품 수만큼 반드시 모두 포함한다.
`;


  /*
   * =====================================================
   * 5. DIRECTOR AI
   * =====================================================
   */

  const result =
    await callAI(

      prompt +

      "\n\n===== PRODUCT CARD INFORMATION =====\n" +

      JSON.stringify(
        directorProducts,
        null,
        2
      )

    );


  console.log(
    "===== HOTDEAL DIRECTOR RESULT ====="
  );

  console.log(
    result
  );

  console.log(
    "===================================="
  );


  const json =
    result
      .replace(
        /^```json/i,
        ""
      )
      .replace(
        /^```/,
        ""
      )
      .replace(
        /```$/,
        ""
      )
      .trim();


  const director =
    JSON.parse(
      json
    );


  /*
   * =====================================================
   * 6. DIRECTOR PLAN
   * =====================================================
   */

  const plans =
    Array.isArray(
      director.products
    )
      ? director.products
      : [];


  const planByOrder =
    new Map(

      plans.map(
        plan =>
          [
            Number(plan.order),
            plan
          ]
      )

    );


  /*
   * =====================================================
   * 7. 원본 상품정보 + 카드 파일 + Director 연출
   * =====================================================
   */

  const finalProducts =
    sourceProducts.map(
      (source, index) => {

        const plan =
          planByOrder.get(
            source.order
          ) || {};

        const card =
          cards[index];

        return {

          order:
            source.order,

          productGroup:
            source.productGroup,

          name:
            source.name,

          price:
            source.price,

          unitPrice:
            source.unitPrice,

          unitLabel:
            source.unitLabel,

          highestPrice:
            source.highestPrice,

          dealRate:
            source.dealRate,

          isHotdeal:
            source.isHotdeal,

          sevenDayLow:
            source.sevenDayLow,

          sevenDayStatus:
            source.sevenDayStatus,

          thirtyDayLow:
            source.thirtyDayLow,

          thirtyDayStatus:
            source.thirtyDayStatus,

          image:
            source.image,

          url:
            source.url,

          /*
           * NEW
           *
           * 실제 영상에서 사용할
           * 세로형 상품 카드
           */
          cardFile:
            card.cardFile,

          displayDuration:
            Number.isFinite(
              Number(
                plan.displayDuration
              )
            )
              ? Number(
                  plan.displayDuration
                )
              : 2.5,

          scrollDuration:
            Number.isFinite(
              Number(
                plan.scrollDuration
              )
            )
              ? Number(
                  plan.scrollDuration
                )
              : 2.5,

          scrollSpeed:
            plan.scrollSpeed ||
            "slow",

          tts:
            typeof plan.tts === "string"
              ? plan.tts
              : "",

          subtitle:
            typeof plan.subtitle === "string"
              ? plan.subtitle
              : "",

          showHotdeal:
            source.isHotdeal === true

        };

      }
    );


  /*
   * =====================================================
   * 8. FINAL RESULT
   * =====================================================
   */

  return {

    title:
      director.title ||
      "오늘의 생필품 가격비교",

    description:
      director.description ||
      "",

    format: {

      aspectRatio:
        "9:16",

      orientation:
        "vertical"

    },

    video: {

      targetDuration:
        35,

      layout:
        "vertical_product_cards",

      scrollDirection:
        "top_to_bottom",

      scrollMode:
        "continuous"

    },

    hook:
      director.hook ||
      {

        tts:
          "오늘 생필품 가격을 비교해보겠습니다.",

        subtitle:
          "오늘의 생필품 가격비교",

        duration:
          2.5

      },

    products:
      finalProducts,

    ending:
      director.ending ||
      {

        tts:
          "오늘 가격은 프로필 상품에서 확인하세요.",

        subtitle:
          "프로필 상품에서 확인하세요",

        duration:
          2.5

      }

  };

}
