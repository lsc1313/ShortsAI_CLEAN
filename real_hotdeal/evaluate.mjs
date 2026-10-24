// Evidence-first candidate validation. No scraping, affiliate actions or publishing.
const validUrl = value => { try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol); } catch { return false; } };
const finitePositive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
const norm = value => String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
export function evaluateCandidate(candidate, observations = []) {
  const reasons = [];
  if (!candidate || typeof candidate !== 'object') return { approved: false, reasons: ['invalid_candidate'] };
  for (const field of ['productId','title','seller','option','sourceUrl','productUrl','observedAt']) {
    if (!String(candidate[field] ?? '').trim()) reasons.push('missing_' + field);
  }
  if (!validUrl(candidate.sourceUrl)) reasons.push('invalid_source_url');
  if (!validUrl(candidate.productUrl)) reasons.push('invalid_product_url');
  const at = Date.parse(candidate.observedAt);
  if (!Number.isFinite(at) || at > Date.now() + 60_000 || Date.now() - at > 6 * 60 * 60 * 1000) reasons.push('stale_or_invalid_timestamp');
  if (candidate.available !== true) reasons.push('availability_unconfirmed');
  if (candidate.checkoutVerified !== true) reasons.push('checkout_not_verified');
  if (!finitePositive(candidate.price) || typeof candidate.shipping !== 'number' || !Number.isFinite(candidate.shipping) || candidate.shipping < 0) reasons.push('invalid_price');
  if (candidate.couponEligible !== true && candidate.couponAmount) reasons.push('coupon_eligibility_unconfirmed');
  if (candidate.couponAmount !== undefined && (typeof candidate.couponAmount !== 'number' || candidate.couponAmount < 0)) reasons.push('invalid_coupon');
  const payable = Number(candidate.price) + Number(candidate.shipping) - (candidate.couponEligible === true ? Number(candidate.couponAmount || 0) : 0);
  if (!Number.isFinite(payable) || payable <= 0) reasons.push('invalid_payable_price');
  const comparable = observations.filter(o => o && norm(o.productId) === norm(candidate.productId) && norm(o.option) === norm(candidate.option) && finitePositive(o.payablePrice) && Number.isFinite(Date.parse(o.observedAt)) && Date.parse(o.observedAt) < at);
  const historicalMin = comparable.length ? Math.min(...comparable.map(o => o.payablePrice)) : null;
  const prior = comparable.length ? comparable.reduce((a,b) => Date.parse(a.observedAt) > Date.parse(b.observedAt) ? a : b) : null;
  const dropPct = prior && prior.payablePrice > payable ? Math.round((prior.payablePrice - payable) / prior.payablePrice * 1000) / 10 : 0;
  // Approval requires independent same-option evidence, not a seller's crossed-out list price.
  if (!prior) reasons.push('insufficient_price_history');
  if (!prior || dropPct < 20) reasons.push('price_drop_below_threshold');
  if (historicalMin !== null && payable > historicalMin) reasons.push('not_historical_low');
  return { approved: reasons.length === 0, reasons, payablePrice: payable, previousPayablePrice: prior?.payablePrice ?? null, dropPct, historicalMin, comparableObservations: comparable.length };
}
