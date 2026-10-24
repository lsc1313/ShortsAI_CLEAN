import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diagnoseSources } from './diagnose.mjs';
test('disabled sources never trigger requests',async()=>{
 const result=await diagnoseSources([{id:'disabled',enabled:false,feedUrl:null}],{fetcher:()=>{throw Error('must not fetch')}});
 assert.equal(result.sources[0].status,'disabled');
 assert.equal(result.verifiedDeals,0);
});
test('reachable feed is not a verified hotdeal',async()=>{
 const now=Date.parse('2026-10-25T00:00:00Z');
 const xml='<rss><channel><item><title>상품 6,900원</title><link>https://example.org/1</link><pubDate>Sat, 24 Oct 2026 23:00:00 GMT</pubDate></item></channel></rss>';
 const result=await diagnoseSources([{id:'fixture',enabled:true,adapter:'rss',feedUrl:'https://example.org/rss'}],{now,fetcher:async()=>({ok:true,text:async()=>xml})});
 assert.equal(result.sources[0].status,'reachable_with_items');
 assert.equal(result.sources[0].review,1);
 assert.equal(result.verifiedDeals,0);
});
test('fetch errors are reported without approval',async()=>{
 const result=await diagnoseSources([{id:'broken',enabled:true,adapter:'rss',feedUrl:'https://example.org/rss'}],{fetcher:async()=>{throw Error('blocked')}});
 assert.equal(result.sources[0].status,'error');
 assert.equal(result.verifiedDeals,0);
});
