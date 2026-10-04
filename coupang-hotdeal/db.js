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

function getProductGroupHistory(db, productGroup) {
  if (!productGroup) {
    return [];
  }

  const rows = [];

  for (const history of Object.values(db)) {
    if (!Array.isArray(history)) {
      continue;
    }

    for (const item of history) {
      if (
        item &&
        item.productGroup === productGroup &&
        Number.isFinite(Number(item.unitPrice)) &&
        Number(item.unitPrice) > 0
      ) {
        rows.push(item);
      }
    }
  }

  return rows.sort(
    (a, b) =>
      String(a.date).localeCompare(String(b.date))
  );
}

function getPriceHistoryByUnit(history, days, latestDateString) {
  if (!history || history.length === 0 || !latestDateString) {
    return [];
  }

  const latestDate = new Date(`${latestDateString}T00:00:00`);
  const startDate = new Date(latestDate);
  startDate.setDate(startDate.getDate() - (days - 1));

  return history.filter(item => {
    const itemDate = new Date(`${item.date}T00:00:00`);
    return (
      itemDate >= startDate &&
      itemDate <= latestDate &&
      Number.isFinite(Number(item.unitPrice)) &&
      Number(item.unitPrice) > 0
    );
  });
}

function getStats(productId) {
  const db = loadDb();
  const history = db[productId] || [];
  if (history.length === 0) return null;

  const today = history[history.length - 1];
  const unitLabel = String(today.unitLabel || "");
  const currentUnitPrice = Number(today.unitPrice);

  // 상품군 비교는 브랜드를 나누지 않는다. 같은 물리 단위끼리만 비교한다.
  const groupHistory = getProductGroupHistory(db, today.productGroup)
    .filter(item => String(item.unitLabel || "") === unitLabel);
  const comparableHistory = groupHistory.length
    ? groupHistory
    : history.filter(item => String(item.unitLabel || "") === unitLabel);

  // '할인율'은 다른 브랜드의 비싼 상품과 비교하지 않는다.
  // 같은 productId의 직전 수집가격과 현재가격만 비교한다.
  const ownPrevious = history
    .slice(0, -1)
    .filter(item =>
      String(item.unitLabel || "") === unitLabel &&
      Number.isFinite(Number(item.unitPrice)) &&
      Number(item.unitPrice) > 0
    )
    .at(-1) || null;

  const referenceUnitPrice = ownPrevious ? Number(ownPrevious.unitPrice) : null;
  const dealRate =
    referenceUnitPrice && referenceUnitPrice > currentUnitPrice
      ? Math.round(((referenceUnitPrice - currentUnitPrice) / referenceUnitPrice) * 1000) / 10
      : null;
  const isHotdeal = dealRate !== null && dealRate >= HOTDEAL_THRESHOLD;

  const allUnitPrices = comparableHistory
    .map(item => Number(item.unitPrice))
    .filter(value => Number.isFinite(value) && value > 0);
  const avg = allUnitPrices.length
    ? allUnitPrices.reduce((a,b) => a+b, 0) / allUnitPrices.length
    : null;
  const avgDiscountPct =
    avg && Number.isFinite(currentUnitPrice)
      ? Math.round(((avg-currentUnitPrice)/avg)*1000)/10
      : null;

  const recentChangePct = dealRate;

  const sevenDayHistory = getPriceHistoryByUnit(comparableHistory, 7, today.date);
  const sevenDayReady = hasEnoughPeriodData(comparableHistory, 7);
  const sevenDayLow = sevenDayReady && sevenDayHistory.length
    ? Math.min(...sevenDayHistory.map(item => Number(item.unitPrice)))
    : null;

  const thirtyDayHistory = getPriceHistoryByUnit(comparableHistory, 30, today.date);
  const thirtyDayReady = hasEnoughPeriodData(comparableHistory, 30);
  const thirtyDayLow = thirtyDayReady && thirtyDayHistory.length
    ? Math.min(...thirtyDayHistory.map(item => Number(item.unitPrice)))
    : null;

  const thisMonth = today.date.slice(0,7);
  const monthPrices = comparableHistory
    .filter(item => String(item.date).slice(0,7) === thisMonth)
    .map(item => Number(item.unitPrice))
    .filter(value => Number.isFinite(value) && value > 0);
  const monthMin = monthPrices.length ? Math.min(...monthPrices) : null;

  return {
    today,
    // 호환용 필드. 이제 다른 상품의 최고가가 아니라 동일 상품 직전 단위가격이다.
    highestPrice: referenceUnitPrice,
    referenceUnitPrice,
    dealRate,
    isHotdeal,
    sevenDayLow,
    sevenDayStatus: sevenDayReady ? '확인 가능' : '수집중',
    thirtyDayLow,
    thirtyDayStatus: thirtyDayReady ? '확인 가능' : '수집중',
    avgDiscountPct,
    recentChangePct,
    isMonthLow: monthMin !== null && currentUnitPrice <= monthMin,
    dataPoints: comparableHistory.length,
  };
}

module.exports = {
  loadDb,
  saveDb,
  recordSnapshot,
  getStats,
};
