// 카테고리 ID가 실제로 뭘 가리키는지 모를 때 쓰는 탐색용 스크립트.
// 아래 ID_LIST에 스크린샷에서 본 번호들을 넣고 돌리면,
// 각 카테고리에서 실제로 어떤 상품이 나오는지 상품명을 콘솔에 찍어줍니다.
// 그걸 보고 "아, 1014가 생활용품이구나" 하는 식으로 눈으로 확인하면 됩니다.
//
// 사용법: node explore-categories.js

const { getBestCategoryProducts } = require('./coupangClient');

const ID_LIST = [1001, 1002, 1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019, 1020, 1021, 1024];

async function run() {
  for (const id of ID_LIST) {
    try {
      const result = await getBestCategoryProducts(id, { limit: 3 });
      const products = result.data || result.rData || [];
      console.log(`\n[categoryId=${id}]`);
      if (products.length === 0) {
        console.log('  (상품 없음 또는 응답 구조가 예상과 다름 - 아래 원본 출력 확인)');
        console.log('  원본:', JSON.stringify(result).slice(0, 300));
      } else {
        products.forEach((p) => console.log(`  - ${p.productName}`));
      }
    } catch (e) {
      console.log(`[categoryId=${id}] 에러:`, e.message);
    }
    // 호출 제한 보호 - 카테고리 사이 텀 주기
    await new Promise((r) => setTimeout(r, 1500));
  }
}

run();
