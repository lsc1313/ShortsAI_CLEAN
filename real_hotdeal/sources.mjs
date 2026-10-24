// Explicit source registry: a source is disabled until its public feed URL is verified.
// Never guess a feed endpoint or scrape an unsupported site.
export const sources = [
  { id: 'ppomppu', name: '뽐뿌', homepage: 'https://www.ppomppu.co.kr/', adapter: 'rss', feedUrl: null, enabled: false },
  { id: 'ruliweb', name: '루리웹', homepage: 'https://www.ruliweb.com/', adapter: 'rss', feedUrl: null, enabled: false },
  { id: 'quasarzone', name: '퀘이사존', homepage: 'https://quasarzone.com/', adapter: 'rss', feedUrl: null, enabled: false },
  { id: 'algumon', name: '알구몬', homepage: 'https://www.algumon.com/', adapter: 'rss', feedUrl: null, enabled: false }
];
// Configure only feeds that are publicly documented and permitted by their provider.
export function activeFeeds(registry = sources) {
  return registry.filter(s => s.enabled === true && s.adapter === 'rss' && typeof s.feedUrl === 'string' && /^https?:\/\//i.test(s.feedUrl)).map(s => s.feedUrl);
}
