// 쿠팡파트너스 공식 가이드 문서 기반 HMAC 서명 생성기
// (쿠팡파트너스 API 가이드 V2 문서에서 그대로 가져온 로직입니다)

const crypto = require('crypto');
const moment = require('moment');

module.exports = {
  /**
   * @param {string} method - 'GET' | 'POST'
   * @param {string} url - 쿼리스트링 포함 전체 path (예: '/v2/providers/.../search?keyword=휴지')
   * @param {string} secretKey
   * @param {string} accessKey
   * @returns {string} Authorization 헤더 값
   */
  generateHmac: (method, url, secretKey, accessKey) => {
    const parts = url.split(/\?/);
    const [path, query = ''] = parts;

    const datetime = moment.utc().format('YYMMDD[T]HHmmss[Z]');
    const message = datetime + method + path + query;

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(message)
      .digest('hex');

    return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
  },
};
