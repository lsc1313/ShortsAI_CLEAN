// Rank unverified community mentions for subsequent manual/automated price checks.
// This module NEVER approves a hotdeal or infers a real discount from the title.
const staleWords = /품절|종료|마감|sold\s*out|expired/i;
const spamWords = /체험단|협찬|광고|홍보|리워드|친구초대|가입이벤트/i;
const pricePattern = /(?:^|\s|\[|\()(\d{1,3}(?:,\d{3})+|\d{4,8})\s*원(?:\s|$|\]|\))/;
export function triageLeads(leads,{now=Date.now(),maxAgeHours=24}={}) {
  if (!Array.isArray(leads)) throw new TypeError('leads must be an array');
  return leads.map(lead=>{
    const title=String(lead?.title??'').trim();
    const published=Date.parse(lead?.published??'');
    const reasons=[];
    if (!title) reasons.push('missing_title');
    if (!Number.isFinite(published)) reasons.push('missing_publish_time');
    else if (published>now+60_000 || now-published>maxAgeHours*3_600_000) reasons.push('outside_freshness_window');
    if(staleWords.test(title)) reasons.push('possibly_expired');
    if(spamWords.test(title)) reasons.push('promotional_or_low_trust');
    const priceMention=title.match(pricePattern)?.[1]??null;
    const priority=(priceMention?2:0)+(Number.isFinite(published)?1:0);
    return {...lead,priority,priceMention:priceMention?Number(priceMention.replaceAll(',','')):null,triageStatus:reasons.length?'hold':'review',reasons,verification:'unverified'};
  }).sort((a,b)=>(a.triageStatus==='review'?0:1)-(b.triageStatus==='review'?0:1)||b.priority-a.priority);
}
