const fs = require('fs');
const path = require('path');
const { DB_PATH, HOTDEAL_THRESHOLD } = require('./config');

function ensureDbFile() {
  const dir = path.dirname(DB_PATH);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(
      DB_PATH,
      JSON.stringify({}, null, 2)
    );
  }
}

function loadDb() {
  ensureDbFile();

  return JSON.parse(
    fs.readFileSync(DB_PATH, 'utf-8')
  );
}

function saveDb(db) {
  fs.writeFileSync(
    DB_PATH,
    JSON.stringify(db, null, 2)
  );
}

/**
 * 오늘 수집한 상품 스냅샷을 DB에 축적
 *
 * 같은 productId는 날짜별 가격 이력을 유지한다.
 */
function recordSnapshot(product) {
  const db = loadDb();

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  if (!db[product.productId]) {
    db[product.productId] = [];
  }

  const history = db[product.productId];
  const last = history[history.length - 1];

  // 같은 날 여러 번 실행하면 마지막 값으로 갱신
  if (last && last.date === today) {
    Object.assign(last, {
      ...product,
      date: today,
    });
  } else {
    history.push({
      ...product,
      date: today,
    });
  }

  saveDb(db);
}

/**
 * 날짜 범위 안의 실제 가격 이력을 가져온다.
 */
function getPriceHistory(history, days) {
  if (!history || history.length === 0) {
    return [];
  }

  const latestDate = new Date(
    `${history[history.length - 1].date}T00:00:00`
  );

  const startDate = new Date(latestDate);
  startDate.setDate(
    startDate.getDate() - (days - 1)
  );

  return history.filter((item) => {
    const itemDate = new Date(
      `${item.date}T00:00:00`
    );

    return (
      itemDate >= startDate &&
      itemDate <= latestDate &&
      Number.isFinite(Number(item.price)) &&
      Number(item.price) > 0
    );
  });
}

/**
 * 기간 데이터가 실제로 확보됐는지 판단한다.
 *
 * 같은 날짜가 여러 번 기록된 경우는
 * recordSnapshot()에서 하나로 합쳐지므로
 * 날짜 수를 기준으로 판단한다.
 */
function hasEnoughPeriodData(history, days) {
  const dates = new Set(
    history.map((item) => item.date)
  );

  if (dates.size < days) {
    return false;
  }

  return true;
}

/**
 * 특정 상품의 가격 통계
 */
function getStats(productId) {
  const db = loadDb();
  const history = db[productId] || [];

  if (history.length === 0) {
    return null;
  }

  const today = history[history.length - 1];

  /*
   * ---------------------------------------------------------
   * 전체 이력 최고가격
   * ---------------------------------------------------------
   */

  const prices = history
    .map((h) => Number(h.price))
    .filter(
      (price) =>
        Number.isFinite(price) &&
        price > 0
    );

  const highestPrice =
    prices.length > 0
      ? Math.max(...prices)
      : null;

  let dealRate = null;

  if (
    highestPrice !== null &&
    Number.isFinite(Number(today.price)) &&
    highestPrice > 0
  ) {
    dealRate =
      Math.round(
        ((highestPrice - Number(today.price)) /
          highestPrice) *
          1000
      ) / 10;
  }

  const isHotdeal =
    dealRate !== null &&
    dealRate >= HOTDEAL_THRESHOLD;

  /*
   * ---------------------------------------------------------
   * 단위가격 평균 / 직전 가격
   * ---------------------------------------------------------
   */

  const unitPrices = history
    .map((h) => Number(h.unitPrice))
    .filter(
      (price) =>
        Number.isFinite(price) &&
        price > 0
    );

  const avg =
    unitPrices.length > 0
      ? unitPrices.reduce(
          (a, b) => a + b,
          0
        ) / unitPrices.length
      : null;

  const avgDiscountPct =
    avg !== null
      ? Math.round(
          ((avg - today.unitPrice) /
            avg) *
            1000
        ) / 10
      : null;

  const prev =
    history.length >= 2
      ? history[history.length - 2]
      : null;

  const recentChangePct =
    prev &&
    Number(prev.unitPrice) > 0
      ? Math.round(
          ((prev.unitPrice -
            today.unitPrice) /
            prev.unitPrice) *
            1000
        ) / 10
      : null;

  /*
   * ---------------------------------------------------------
   * 7일 최저가
   * ---------------------------------------------------------
   */

  const sevenDayHistory =
    getPriceHistory(history, 7);

  const sevenDayReady =
    hasEnoughPeriodData(history, 7);

  const sevenDayLow =
    sevenDayReady &&
    sevenDayHistory.length > 0
      ? Math.min(
          ...sevenDayHistory.map(
            (item) => Number(item.price)
          )
        )
      : null;

  /*
   * ---------------------------------------------------------
   * 30일 최저가
   * ---------------------------------------------------------
   */

  const thirtyDayHistory =
    getPriceHistory(history, 30);

  const thirtyDayReady =
    hasEnoughPeriodData(history, 30);

  const thirtyDayLow =
    thirtyDayReady &&
    thirtyDayHistory.length > 0
      ? Math.min(
          ...thirtyDayHistory.map(
            (item) => Number(item.price)
          )
        )
      : null;

  /*
   * ---------------------------------------------------------
   * 이번 달 최저 단위가격
   * ---------------------------------------------------------
   */

  const thisMonth =
    today.date.slice(0, 7);

  const thisMonthPrices =
    history
      .filter(
        (h) =>
          h.date.slice(0, 7) ===
          thisMonth
      )
      .map((h) => Number(h.unitPrice))
      .filter(
        (price) =>
          Number.isFinite(price) &&
          price > 0
      );

  const monthMin =
    thisMonthPrices.length > 0
      ? Math.min(...thisMonthPrices)
      : null;

  const isMonthLow =
    monthMin !== null &&
    today.unitPrice <= monthMin;

  return {
    today,

    highestPrice,
    dealRate,
    isHotdeal,

    sevenDayLow,
    sevenDayStatus:
      sevenDayReady
        ? '확인 가능'
        : '수집중',

    thirtyDayLow,
    thirtyDayStatus:
      thirtyDayReady
        ? '확인 가능'
        : '수집중',

    avgDiscountPct,
    recentChangePct,
    isMonthLow,

    dataPoints: history.length,
  };
}

module.exports = {
  loadDb,
  saveDb,
  recordSnapshot,
  getStats,
};
