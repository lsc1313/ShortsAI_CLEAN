const axios = require('axios');
const { generateHmac } = require('./hmacGenerator');
const { ACCESS_KEY, SECRET_KEY } = require('./config');

const DOMAIN = 'https://api-gateway.coupang.com';

async function request(method, url, data) {
  const authorization = generateHmac(method, url, SECRET_KEY, ACCESS_KEY);
  try {
    const response = await axios.request({
      method,
      url: DOMAIN + url,
      headers: { Authorization: authorization },
      data,
    });
    return response.data;
  } catch (err) {
    // 실패 시 쿠팡이 내려주는 에러 메시지를 그대로 보여줌 (원인 파악 쉽게)
    console.error('쿠팡 API 에러:', err.response ? err.response.data : err.message);
    throw err;
  }
}

module.exports = {
  /**
   * 베스트카테고리(골드박스) 상품 조회
   * ⚠️ 정확한 path/파라미터명은 파트너스 API 가이드 "문서" 탭에서 categoryId 조회 API 스펙을 확인해
   *    필요 시 아래 url을 맞춰 수정하세요. 아래는 일반적으로 쓰이는 형태입니다.
   */
  getBestCategoryProducts: (categoryId, { limit = 20, subId = '' } = {}) => {
    const query = `limit=${limit}${subId ? `&subId=${subId}` : ''}`;
    const url = `/v2/providers/affiliate_open_api/apis/openapi/v1/products/bestcategories/${categoryId}?${query}`;
    return request('GET', url);
  },

  /**
   * 키워드 상품 검색
   * ⚠️ 호출 제한이 있으니(시간당 소수 회) 자주 호출하지 말 것.
   */
  searchProducts: (keyword, { limit = 10, subId = '' } = {}) => {
    const query = `keyword=${encodeURIComponent(keyword)}&limit=${limit}${subId ? `&subId=${subId}` : ''}`;
    const url = `/v2/providers/affiliate_open_api/apis/openapi/products/search?${query}`;
    return request('GET', url);
  },

  /**
   * 일반 쿠팡 상품 URL -> 파트너스 딥링크(단축링크) 생성
   * (공식 가이드 문서에 나온 예시 그대로)
   */
  createDeeplink: (coupangUrls) => {
    const url = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink';
    return request('POST', url, { coupangUrls });
  },
};
