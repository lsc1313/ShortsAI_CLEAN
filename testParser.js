import {resolvePartnerLink}
from "./modules/productExtractor/resolver.js";

import {parseProduct}
from "./modules/productExtractor/parser.js";

const resolved=
await resolvePartnerLink(
"https://link.coupang.com/a/f0MvXjfzDo"
);

const product=
await parseProduct(
resolved.realUrl
);

console.log(product);
