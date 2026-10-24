import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseFeed, collectFeeds } from './collect.mjs';
import { triageLeads } from './triage.mjs';
const xml = '<rss><channel><item><title><![CDATA[생수 6,900원]]></title><link>https://example.org/deal/1</link><pubDate>Sun, 25 Oct 2026 00:00:00 GMT</pubDate></item><item><title>중복</title><link>https://example.org/deal/1</link></item></channel></rss>';
test('RSS parses title, link, and timestamp', () => {
 const rows = parseFeed(xml, 'https://example.org/rss');
 assert.equal(rows.length, 2);
 assert.equal(rows[0].title, '생수 6,900원');
 assert.equal(rows[0].url, 'https://example.org/deal/1');
});
test('collector deduplicates and preserves provenance', async () => {
 const fakeFetch = async () => ({ok:true,text:async()=>xml});
 const result = await collectFeeds(['https://example.org/rss'], {fetcher:fakeFetch});
 assert.equal(result.leads.length, 1);
 assert.equal(result.leads[0].verification, 'unverified');
});
test('triage holds stale and expired mentions', () => {
 const result=triageLeads([{title:'품절 6,900원',published:'2020-01-01T00:00:00Z',url:'https://example.org/deal'}]);
 assert.equal(result[0].triageStatus,'hold');
 assert.equal(result[0].verification,'unverified');
});
