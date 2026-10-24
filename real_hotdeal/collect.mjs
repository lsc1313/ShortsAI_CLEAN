// Collect public RSS/Atom deal mentions as unverified leads. Never claim prices or discounts.
import fs from 'node:fs/promises';
const decode = s => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const extract = (s, tag) => (s.match(new RegExp('<(?:[\\w-]+:)?'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?'+tag+'>','i')) || [,''])[1];
const linkOf = s => {
  const raw = extract(s,'link');
  if (raw.trim()) return decode(raw);
  const match = s.match(/<link\b[^>]*\bhref=["']([^"']+)["']/i);
  return match?.[1] || '';
};
const safeHttp = url => { try { const u = new URL(url); return ['https:','http:'].includes(u.protocol) && !['localhost','127.0.0.1','::1'].includes(u.hostname) && !u.hostname.endsWith('.local'); } catch { return false; } };
export function parseFeed(xml, sourceUrl) {
  const blocks = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
  return blocks.slice(0,100).map(m => {
    const body=m[2], title=decode(extract(body,'title')), url=linkOf(body), published=decode(extract(body,'pubDate') || extract(body,'published') || extract(body,'updated'));
    return {title,sourceUrl,url,published,verification:'unverified',type:'deal_mention'};
  }).filter(x=>x.title && safeHttp(x.url));
}
export async function collectFeeds(urls,{fetcher=fetch}={}) {
  const output=[], errors=[];
  for (const url of urls) {
    if (!safeHttp(url)) { errors.push({url,error:'invalid_feed_url'}); continue; }
    try {
      const res=await fetcher(url,{headers:{Accept:'application/rss+xml, application/atom+xml, application/xml, text/xml'},signal:AbortSignal.timeout(12000),redirect:'error'});
      if (!res.ok) throw Error('HTTP '+res.status);
      const text=await res.text();
      if (text.length>2_000_000) throw Error('feed_too_large');
      output.push(...parseFeed(text,url));
    } catch(e) { errors.push({url,error:String(e.message)}); }
  }
  const seen=new Set();
  return {collectedAt:new Date().toISOString(),leads:output.filter(x=>{const k=x.url.split('#')[0];if(seen.has(k))return false;seen.add(k);return true;}),errors};
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1].replace(/\\/g,'/')).href) {
  const file=process.argv[2];
  if(!file) {console.error('Usage: node real_hotdeal/collect.mjs feed-urls.json');process.exitCode=2;}
  else {
    const urls=JSON.parse(await fs.readFile(file,'utf8'));
    if(!Array.isArray(urls)) throw Error('Feed list must be a JSON array');
    console.log(JSON.stringify(await collectFeeds(urls),null,2));
  }
}
