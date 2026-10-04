const fs = require('fs');
const path = require('path');

const { searchProducts } = require('./coupangClient');
const { calcUnitPrice } = require('./unitPrice');
const { recordSnapshot, getStats } = require('./db');
const { PRODUCTS, SUB_ID } = require('./config');

const SEARCH_LIMIT = 10;
const MIN_DATA_POINTS_FOR_CLAIMS = 5;

const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_PATH = path.join(DATA_DIR, 'products.json');
const TODAY_PRODUCTS_PATH = path.join(DATA_DIR, 'today-products.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadProducts() {
  ensureDataDir();

  if (!fs.existsSync(PRODUCTS_PATH)) {
    const initial = Object.fromEntries(
      Object.entries(PRODUCTS).map(([name, keyword]) => [
        name,
        {
          name,
          keyword,
          enabled: true,
        },
      ])
    );

    fs.writeFileSync(
      PRODUCTS_PATH,
      JSON.stringify(initial, null, 2),
      'utf-8'
    );
  }

  return JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf-8'));
}

function saveProducts(products) {
  ensureDataDir();

  fs.writeFileSync(
    PRODUCTS_PATH,
    JSON.stringify(products, null, 2),
    'utf-8'
  );
}

/* =========================================================
   ① 상품 추가
========================================================= */
function addProduct(name, keyword = name) {
  const products = loadProducts();

  if (!name || !String(name).trim()) {
    throw new Error('상품명을 입력해야 합니다.');
  }

  name = String(name).trim();
  keyword = String(keyword || name).trim();

  if (products[name]) {
    throw new Error('이미 존재하는 상품입니다.');
  }

  products[name] = {
    name,
    keyword,
    enabled: true,
  };

  saveProducts(products);

  return products[name];
}

/* =========================================================
   ② 상품 제거
   비활성 처리
========================================================= */
function removeProduct(name) {
  const products = loadProducts();

  if (!products[name]) {
    throw new Error('상품을 찾을 수 없습니다.');
  }

  products[name].enabled = false;

  saveProducts(products);

  return products[name];
}

/* =========================================================
   ③ 완전삭제
========================================================= */
function deleteProduct(name) {
  const products = loadProducts();

  if (!products[name]) {
    throw new Error('상품을 찾을 수 없습니다.');
  }

  const deleted = products[name];

  delete products[name];

  saveProducts(products);

  return deleted;
}

/* =========================================================
   ④ 상품목록 — 활성 / 비활성
========================================================= */
function getProductList() {
  const products = loadProducts();

  return Object.values(products);
}

function getActiveProducts() {
  return getProductList().filter((product) => product.enabled === true);
}

function getInactiveProducts() {
  return getProductList().filter((product) => product.enabled !== true);
}

function setProductEnabled(name, enabled) {
  const products = loadProducts();

  if (!products[name]) {
    throw new Error('상품을 찾을 수 없습니다.');
  }

  products[name].enabled = Boolean(enabled);

  saveProducts(products);

  return products[name];
}

/* =========================================================
   ⑤ 상품정보 검색
========================================================= */
async function searchProductInfo(keyword, limit = SEARCH_LIMIT) {
  if (!keyword || !String(keyword).trim()) {
    throw new Error('검색어를 입력해야 합니다.');
  }

  const result = await searchProducts(
    String(keyword).trim(),
    {
      limit,
      subId: SUB_ID,
    }
  );

  if (
    !result ||
    !result.data ||
    !Array.isArray(result.data.productData)
  ) {
    return [];
  }

  return result.data.productData;
}

/* =========================================================
   오늘의 상품 데이터 저장
========================================================= */
function saveTodayProducts(products) {
  ensureDataDir();

  const output = {
    generatedAt: new Date().toISOString(),
    productCount: products.length,
    products,
  };

  fs.writeFileSync(
    TODAY_PRODUCTS_PATH,
    JSON.stringify(output, null, 2),
    'utf-8'
  );
}

function isProductGroupMatch(productGroup, productName) {
  const group = String(productGroup || "").trim();
  const name = String(productName || "").toLowerCase();

  // 브랜드는 제한하지 않고, 서로 다른 상품 종류만 교차 유입을 막는다.
  const excluded = {
    "화장지": ["키친타월", "키친타올", "주방타월", "주방타올", "냅킨", "핸드타월", "핸드타올"],
    "키친타월": ["화장지", "두루마리", "롤휴지", "미용티슈", "각티슈"],
    "물티슈": ["키친타월", "키친타올", "화장지"],
    "생수": ["탄산수", "음료", "주스", "이온음료"]
  };

  return !(excluded[group] || []).some(word => name.includes(word));
}

/* =========================================================
   ⑥ 쇼츠제작용 데이터 생성
========================================================= */
async function run(activeProductGroups = null) {
  const todayProducts = [];
  const configuredProducts = loadProducts();

  const productEntries =
    Array.isArray(activeProductGroups) &&
    activeProductGroups.length > 0
      ? Object.entries(configuredProducts)
          .filter(([productGroup, product]) =>
            product.enabled === true &&
            activeProductGroups.includes(productGroup)
          )
          .map(([productGroup, product]) => [
            productGroup,
            product.keyword,
          ])
      : Object.entries(configuredProducts)
          .filter(([, product]) => product.enabled === true)
          .map(([productGroup, product]) => [
            productGroup,
            product.keyword,
          ]);

  for (const [productGroup, keyword] of productEntries) {
    console.log(`\n=== ${productGroup} 조사 ===`);

    try {
      const result = await searchProducts(keyword, {
        limit: SEARCH_LIMIT,
        subId: SUB_ID,
      });

      if (
        !result ||
        !result.data ||
        !Array.isArray(result.data.productData)
      ) {
        console.log('검색 결과가 없습니다.');
        continue;
      }

      const candidates = [];

      for (const p of result.data.productData) {
        const productId = String(p.productId || '');
        const name = p.productName;
        const price = Number(p.productPrice);
        const url = p.productUrl;
        const image = p.productImage;

        if (
          !productId ||
          !name ||
          !Number.isFinite(price) ||
          price <= 0
        ) {
          continue;
        }

        if (!isProductGroupMatch(productGroup, name)) {
          console.log(`[HOTDEAL FILTER] ${productGroup} 제외: ${name}`);
          continue;
        }

        const parsed = calcUnitPrice(name, price);

        if (parsed.confidence === 'low') {
          continue;
        }

        candidates.push({
          productId,
          name,
          price,
          unitPrice: parsed.unitPrice,
          unitCount: parsed.unitCount,
          unitLabel: parsed.unitLabel,
          confidence: parsed.confidence,
          url,
          image,
        });
      }

      if (candidates.length === 0) {
        console.log('단위가격을 신뢰할 수 있는 상품이 없습니다.');
        continue;
      }

      for (const candidate of candidates) {
        recordSnapshot({
          productId: candidate.productId,
          name: candidate.name,
          price: candidate.price,
          unitPrice: candidate.unitPrice,
          unitCount: candidate.unitCount,
          unitLabel: candidate.unitLabel,
          url: candidate.url,
          image: candidate.image,
          productGroup,
        });
      }

      console.log(
        `[HOTDEAL] ${productGroup} 상품정보 갱신 완료: ${candidates.length}개`
      );

      candidates.sort((a, b) => a.unitPrice - b.unitPrice);

      const best = candidates[0];

      const stats = getStats(best.productId);

      todayProducts.push({
        order: todayProducts.length + 1,
        productGroup,
        keyword,

        productId: best.productId,
        name: best.name,
        price: best.price,

        unitPrice: best.unitPrice,
        unitCount: best.unitCount,
        unitLabel: best.unitLabel,
        confidence: best.confidence,

        image: best.image,
        url: best.url,

        dataPoints: stats ? stats.dataPoints : 0,

        // 동일 상품의 직전 단위가격. 할인율 기준용.
        highestPrice:
          stats && Number.isFinite(stats.highestPrice)
            ? stats.highestPrice
            : null,

        referenceUnitPrice:
          stats && Number.isFinite(stats.referenceUnitPrice)
            ? stats.referenceUnitPrice
            : null,

        dealRate:
          stats && Number.isFinite(stats.dealRate)
            ? stats.dealRate
            : null,

        isHotdeal:
          stats ? stats.isHotdeal === true : false,

        sevenDayLow:
          stats && Number.isFinite(stats.sevenDayLow)
            ? stats.sevenDayLow
            : null,

        sevenDayStatus:
          stats?.sevenDayStatus || '수집중',

        thirtyDayLow:
          stats && Number.isFinite(stats.thirtyDayLow)
            ? stats.thirtyDayLow
            : null,

        thirtyDayStatus:
          stats?.thirtyDayStatus || '수집중',

        comparisonCount: candidates.length,
      });

      console.log(`[완료] ${productGroup}`);
    } catch (error) {
      console.error(
        `[${productGroup}] 조사 실패:`,
        error.message
      );
    }
  }

  saveTodayProducts(todayProducts);

  console.log(
    `상품정보 갱신 완료: ${todayProducts.length}/${productEntries.length}`
  );

  return todayProducts;
}

module.exports = {
  run,

  addProduct,
  removeProduct,
  deleteProduct,

  getProductList,
  getActiveProducts,
  getInactiveProducts,
  setProductEnabled,

  searchProductInfo,

  PRODUCTS,
};

if (require.main === module) {
  run().catch((error) => {
    console.error('실행 중 오류:', error.message);
    process.exit(1);
  });
}
