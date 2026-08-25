const ACCESS_KEY = 'a7de4ab1-4f81-4d21-980c-a7b98eeb6fa2';
const SECRET_KEY = 'ed886825b3315804e7672e809319856b7d877938';

// 콘텐츠에 붙일 서브 아이디
const SUB_ID = '';

// 오늘의 생필품 최저가 조사 상품군
const PRODUCTS = {
  화장지: '화장지',
  키친타월: '키친타월',
  물티슈: '물티슈',
  생수: '생수',
  즉석밥: '즉석밥',
  주방세제: '주방세제',
  샴푸: '샴푸 ml',
  컨디셔너: '컨디셔너 ml',
  바디워시: '바디워시',
  치약: '치약 g',
  위생장갑: '위생장갑',
};

// 최고가격 대비 할인율이 이 값 이상이면 핫딜
const HOTDEAL_THRESHOLD = 30;

const DB_PATH =
  __dirname + '/data/hotdeal-db.json';

module.exports = {
  ACCESS_KEY,
  SECRET_KEY,
  SUB_ID,
  PRODUCTS,
  HOTDEAL_THRESHOLD,
  DB_PATH,
};
