import {resolvePartnerLink}
from "./modules/productExtractor/resolver.js";

import {getProductHTML}
from "./modules/productExtractor/scraper.js";

const r=
await resolvePartnerLink(
"https://link.coupang.com/a/f0MvXjfzDo"
);

const html=
await getProductHTML(r.realUrl);

console.log(
html.substring(0,1000)
);
