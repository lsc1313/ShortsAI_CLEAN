function roundMoney(value) {
  return Math.round(value);
}

function normalizeComparableUnit(totalUnits, unitLabel) {
  const label = String(unitLabel || "").toLowerCase();

  // 가격비교 공통 최소단위: L -> ml, kg -> g
  if (label === "l") {
    return { totalUnits: totalUnits * 1000, unitLabel: "ml" };
  }

  if (label === "kg") {
    return { totalUnits: totalUnits * 1000, unitLabel: "g" };
  }

  return { totalUnits, unitLabel };
}

function normalizeName(name) {
  return String(name || '')
    .replace(/[×✕✖]/g, 'x')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUnitLabel(raw) {
  const label = String(raw || '').toLowerCase();

  if (label === '개입' || label === 'p') return '개';
  if (label === '매입') return '매';

  return label;
}

function parseUnitCount(productName) {
  const name = normalizeName(productName);

  if (!name) {
    return {
      totalUnits: 1,
      unitLabel: '개',
      confidence: 'low',
    };
  }

  /*
   * ---------------------------------------------------------
   * 0. 본품 + 부속품은 "1개"로 처리
   * ---------------------------------------------------------
   */

  const hasAccessoryCombination =
    /\+\s*.*(노즐|노즐커버|커버|필터|스트랩|암밴드|핸드\s*스트랩|케이스|리필)/i.test(name);

  const hasMainProduct =
    /(본품|1개|1세트|세트)/i.test(name);

  if (hasAccessoryCombination && hasMainProduct) {
    return {
      totalUnits: 1,
      unitLabel: '개',
      confidence: 'high',
    };
  }

  /*
   * ---------------------------------------------------------
   * 1. 내용물 수량 x 팩 수량
   *
   * 70매 x 20팩 -> 1400매
   * 30롤 x 2팩 -> 60롤
   *
   * 상품명 뒤에 "70개입, 20개" 같은
   * 동일 구성의 설명이 반복될 수 있으므로
   * 이 패턴을 가장 먼저 확정한다.
   * ---------------------------------------------------------
   */

  const unitXPack = name.match(
    /(\d+(?:\.\d+)?)\s*(롤|매|장|개입|개|입|포|p)\s*x\s*(\d+(?:\.\d+)?)\s*(팩|박스|세트)/i
  );

  if (unitXPack) {
    const units = parseFloat(unitXPack[1]);
    const label = normalizeUnitLabel(unitXPack[2]);
    const packs = parseFloat(unitXPack[3]);

    return {
      totalUnits: units * packs,
      unitLabel: label,
      confidence: 'high',
    };
  }

  /*
   * ---------------------------------------------------------
   * 1. 용량 x 수량
   *
   * 500ml x 20개 -> 10000ml
   * 1L x 18병 -> 18L
   * ---------------------------------------------------------
   */

  const volumeXCount = name.match(
    /(\d+(?:\.\d+)?)\s*(ml|mL|ML|l|L|kg|KG|g|G)\s*x\s*(\d+(?:\.\d+)?)\s*(병|개|팩|입|개입|본|캔|롤)/i
  );

  if (volumeXCount) {
    const amount = parseFloat(volumeXCount[1]);
    const unit = volumeXCount[2].toLowerCase();
    const count = parseFloat(volumeXCount[3]);

    return {
      totalUnits: amount * count,
      unitLabel: unit === 'l' ? 'L' : unit,
      confidence: 'high',
    };
  }

  /*
   * ---------------------------------------------------------
   * 2. 반복 용량 + 구성
   *
   * 900g + 900g + 900g -> 2700g
   * 500ml + 500ml -> 1000ml
   *
   * 같은 용량 단위를 여러 번 명시한 상품은 합산.
   * ---------------------------------------------------------
   */

  const volumePlusMatches = [
    ...name.matchAll(
      /(\d+(?:\.\d+)?)\s*(ml|mL|ML|l|L|kg|KG|g|G)\s*(?=\+|$)/gi
    ),
  ];

  if (volumePlusMatches.length >= 2) {
    const labels = volumePlusMatches.map((m) => {
      const raw = m[2].toLowerCase();
      return raw === 'l' ? 'L' : raw;
    });

    const uniqueLabels = [...new Set(labels)];

    if (uniqueLabels.length === 1) {
      const total = volumePlusMatches.reduce(
        (sum, m) => sum + parseFloat(m[1]),
        0
      );

      return {
        totalUnits: total,
        unitLabel: uniqueLabels[0],
        confidence: 'high',
      };
    }
  }

  /*
   * ---------------------------------------------------------
   * 3. 내용물 수량 + 묶음 수량
   *
   * 487매, 2개 -> 974매
   * 30롤, 2개 -> 60롤
   * 200개입, 2개 -> 400개
   *
   * "200매, 200개입, 2개"처럼
   * 같은 구성 수량이 반복 표기되는 경우에는
   * "200매"와 마지막 "2개"만 계산한다.
   * 중간의 "200개입"은 구성 설명이므로
   * 다시 곱하지 않는다.
   * ---------------------------------------------------------
   */

  const contentMatch = name.match(
    /(\d+(?:\.\d+)?)\s*(롤|매|매입|장|입|포|p)(?=\s*(?:,|$))/i
  );

  const packageMatch = name.match(
    /(\d+(?:\.\d+)?)\s*개(?!입)/i
  );

  if (contentMatch && packageMatch) {
    const contentCount = parseFloat(contentMatch[1]);
    const contentLabel = normalizeUnitLabel(contentMatch[2]);
    const packageCount = parseFloat(packageMatch[1]);

    return {
      totalUnits: contentCount * packageCount,
      unitLabel: contentLabel,
      confidence: 'high',
    };
  }

  /*
   * "200개입, 2개"처럼
   * 내용물 단위 자체가 "개"인 경우
   */

  const contentItemMatch = name.match(
    /(\d+(?:\.\d+)?)\s*개입/i
  );

  if (contentItemMatch && packageMatch) {
    return {
      totalUnits:
        parseFloat(contentItemMatch[1]) *
        parseFloat(packageMatch[1]),
      unitLabel: '개',
      confidence: 'high',
    };
  }

  /*
   * ---------------------------------------------------------
   * 4. 용량 + 수량
   *
   * 500ml, 20개
   * 210g, 12개
   * 275ml, 5개
   *
   * => 용량 × 수량
   * ---------------------------------------------------------
   */

  const volumeCommaCount = name.match(
    /(\d+(?:\.\d+)?)\s*(ml|mL|ML|l|L|kg|KG|g|G)\s*,\s*(\d+(?:\.\d+)?)\s*(병|개|팩|입|개입|본|캔|롤)/i
  );

  if (volumeCommaCount) {
    const amount = parseFloat(volumeCommaCount[1]);
    const unit = volumeCommaCount[2].toLowerCase();
    const count = parseFloat(volumeCommaCount[3]);

    return {
      totalUnits: amount * count,
      unitLabel: unit === 'l' ? 'L' : unit,
      confidence: 'high',
    };
  }

  /*
   * ---------------------------------------------------------
   * 5. 용량 + 수량
   *
   * 500ml 20개
   * 210g 12개
   * ---------------------------------------------------------
   */

  const volumeSpaceCount = name.match(
    /(\d+(?:\.\d+)?)\s*(ml|mL|ML|l|L|kg|KG|g|G)\s+(\d+(?:\.\d+)?)\s*(병|개|팩|입|개입|본|캔|롤)/i
  );

  if (volumeSpaceCount) {
    const amount = parseFloat(volumeSpaceCount[1]);
    const unit = volumeSpaceCount[2].toLowerCase();
    const count = parseFloat(volumeSpaceCount[3]);

    return {
      totalUnits: amount * count,
      unitLabel: unit === 'l' ? 'L' : unit,
      confidence: 'high',
    };
  }

  /*
   * ---------------------------------------------------------
   * 6. 같은 단위의 + 구성
   *
   * 50매 + 50매 -> 100매
   * 10개 + 20개 -> 30개
   * ---------------------------------------------------------
   */

  const plusMatches = [
    ...name.matchAll(
      /(\d+(?:\.\d+)?)\s*(롤|매|개입|개|장|입|포|p)(?=\s*(?:\+|$))/gi
    ),
  ];

  if (plusMatches.length >= 2) {
    const labels = plusMatches.map((m) => {
      return normalizeUnitLabel(m[2]);
    });

    const uniqueLabels = [...new Set(labels)];

    if (uniqueLabels.length === 1) {
      const total = plusMatches.reduce(
        (sum, m) => sum + parseFloat(m[1]),
        0
      );

      return {
        totalUnits: total,
        unitLabel: uniqueLabels[0],
        confidence: 'high',
      };
    }
  }

  /*
   * ---------------------------------------------------------
   * 7. 숫자 + 단위 + 팩
   *
   * 100매 10팩 -> 1000매
   * 30롤 3팩 -> 90롤
   * ---------------------------------------------------------
   */

  const unitPack = name.match(
    /(\d+(?:\.\d+)?)\s*(롤|매|개입|개|장|입|포|p)\s*(?:x\s*)?(\d+(?:\.\d+)?)\s*(팩|박스|세트|box|set)/i
  );

  if (unitPack) {
    const units = parseFloat(unitPack[1]);
    const rawLabel = unitPack[2].toLowerCase();
    const packs = parseFloat(unitPack[3]);

    const label = normalizeUnitLabel(rawLabel);

    return {
      totalUnits: units * packs,
      unitLabel: label,
      confidence: 'high',
    };
  }

  /*
   * ---------------------------------------------------------
   * 8. 직접 수량
   *
   * 10개입
   * 20매입
   * 10롤
   * ---------------------------------------------------------
   */

  const directCount = name.match(
    /(\d+(?:\.\d+)?)\s*(개입|매입|롤|매|장|입|포|p)/i
  );

  if (directCount) {
    const count = parseFloat(directCount[1]);
    const label = normalizeUnitLabel(directCount[2]);

    return {
      totalUnits: count,
      unitLabel: label,
      confidence: 'high',
    };
  }

  /*
   * ---------------------------------------------------------
   * 9. 용량 단독
   *
   * 500ml
   * 1kg
   * 20g
   * ---------------------------------------------------------
   */

  const volume = name.match(
    /(\d+(?:\.\d+)?)\s*(ml|mL|ML|l|L|kg|KG|g|G)(?!\w)/i
  );

  if (volume) {
    const unit = volume[2].toLowerCase();

    return {
      totalUnits: parseFloat(volume[1]),
      unitLabel: unit === 'l' ? 'L' : unit,
      confidence: 'medium',
    };
  }

  /*
   * ---------------------------------------------------------
   * 10. 판단 불가
   * ---------------------------------------------------------
   */

  return {
    totalUnits: 1,
    unitLabel: '개',
    confidence: 'low',
  };
}

function calcUnitPrice(productName, price) {
  const parsed = parseUnitCount(productName);

  const unitCount =
    Number.isFinite(parsed.totalUnits) && parsed.totalUnits > 0
      ? parsed.totalUnits
      : 1;

  const numericPrice = Number(price) || 0;
  const normalized = normalizeComparableUnit(
    unitCount,
    parsed.unitLabel
  );

  return {
    // 원화 비교/표시/TTS에는 소수 가격을 사용하지 않는다.
    unitPrice: roundMoney(numericPrice / normalized.totalUnits),
    unitCount: normalized.totalUnits,
    unitLabel: normalized.unitLabel,
    confidence: parsed.confidence,
  };
}

module.exports = {
  parseUnitCount,
  calcUnitPrice,
};
