import fs from "fs";

console.log("======================================");
console.log("NAVER PRODUCT STRUCTURE TRACE V11");
console.log("======================================");

const TARGET = "13655756767";

function findHtml(dir=".", depth=0) {
  if (depth > 3) return null;

  let list;
  try {
    list = fs.readdirSync(dir, {withFileTypes:true});
  } catch {
    return null;
  }

  for (const x of list) {
    const p = `${dir}/${x.name}`;

    if (
      x.isFile() &&
      /\.html?$/i.test(x.name)
    ) {
      try {
        const s = fs.readFileSync(p,"utf8");
        if (s.includes(TARGET)) return {file:p, html:s};
      } catch {}
    }
  }

  for (const x of list) {
    if (
      x.isDirectory() &&
      !["node_modules",".git"].includes(x.name)
    ) {
      const r = findHtml(`${dir}/${x.name}`,depth+1);
      if (r) return r;
    }
  }

  return null;
}

const result = findHtml();

if (!result) {
  console.log("");
  console.log("ERROR: TARGET HTML NOT FOUND");
  console.log("TARGET:",TARGET);
  console.log("V11 STOP");
  process.exit(1);
}

const {file,html} = result;

console.log("");
console.log("===== 1. SOURCE =====");
console.log("FILE   :",file);
console.log("SIZE   :",html.length);

const positions=[];
let p=0;

while ((p=html.indexOf(TARGET,p)) !== -1) {
  positions.push(p);
  p += TARGET.length;
}

console.log("TARGET MATCH :",positions.length);

const keys=[
  "productId",
  "productNo",
  "mallProductId",
  "itemId",
  "catalogId",
  "nvMid",
  "nvmid",
  "productName",
  "productTitle",
  "mallName",
  "price",
  "shopping"
];

console.log("");
console.log("===== 2. KEYWORDS NEAR TARGET =====");

const stats={};

for (const k of keys) stats[k]=0;

for (const pos of positions) {
  const ctx=html.slice(
    Math.max(0,pos-1500),
    Math.min(html.length,pos+1500)
  );

  for (const k of keys) {
    if (ctx.toLowerCase().includes(k.toLowerCase())) {
      stats[k]++;
    }
  }
}

for (const [k,v] of Object.entries(stats)) {
  console.log(k.padEnd(18),":",v);
}

console.log("");
console.log("===== 3. REAL KEY/VALUE CANDIDATES =====");

const found=new Set();

for (const pos of positions) {

  const ctx=html.slice(
    Math.max(0,pos-4000),
    Math.min(html.length,pos+4000)
  );

  for (const key of keys) {

    const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");

    const patterns=[
      new RegExp(
        `["']?${escaped}["']?\\s*[:=]\\s*["']([^"'<>]{1,150})["']`,
        "gi"
      ),
      new RegExp(
        `["']?${escaped}["']?\\s*[:=]\\s*([0-9]{3,30})`,
        "gi"
      )
    ];

    for (const re of patterns) {
      let m;

      while ((m=re.exec(ctx)) !== null) {
        found.add(`${key} = ${m[1]}`);
      }
    }
  }
}

if (!found.size) {
  console.log("NO REAL KEY/VALUE FOUND");
} else {
  [...found].slice(0,100).forEach(x=>console.log(x));
}

console.log("");
console.log("===== 4. EMBEDDED DATA =====");

const checks={
  "__NEXT_DATA__":/__NEXT_DATA__/g,
  "__APOLLO_STATE__":/__APOLLO_STATE__/g,
  "__INITIAL_STATE__":/__INITIAL_STATE__/g,
  "application/ld+json":/application\/ld\+json/g,
  "application/json":/application\/json/g,
  "JSON.parse":/JSON\.parse\s*\(/g
};

for (const [name,re] of Object.entries(checks)) {
  console.log(
    name.padEnd(22),
    ":",
    (html.match(re)||[]).length
  );
}

console.log("");
console.log("===== 5. PRODUCT URL CANDIDATES =====");

const urls=[
  ...new Set(
    html.match(/https?:\/\/[^"'<>\\\s]+/gi)||[]
  )
];

const productUrls=urls.filter(x=>
  /shopping|product|catalog|smartstore|brandstore|storefarm/i.test(x)
);

console.log("ALL URLS     :",urls.length);
console.log("PRODUCT URLS :",productUrls.length);

productUrls.slice(0,30).forEach(x=>
  console.log(x.slice(0,800))
);

console.log("");
console.log("===== 6. TARGET CONTEXT CLASSIFICATION =====");

const types={
  PRODUCT:0,
  IMAGE:0,
  BLOG:0,
  QUERY:0,
  OTHER:0
};

for (const pos of positions) {

  const ctx=html.slice(
    Math.max(0,pos-1200),
    Math.min(html.length,pos+1200)
  );

  let type="OTHER";

  if (
    /productId|mallProductId|productName|mallName|shopping/i.test(ctx)
  ) type="PRODUCT";
  else if (
    /m_image|ImageSearch|lensAPI|viewerOmni/i.test(ctx)
  ) type="IMAGE";
  else if (
    /blog\.naver\.com/i.test(ctx)
  ) type="BLOG";
  else if (
    /query/i.test(ctx)
  ) type="QUERY";

  types[type]++;
}

for (const [k,v] of Object.entries(types)) {
  console.log(k.padEnd(10),":",v);
}

console.log("");
console.log("===== 7. V11 SUMMARY =====");
console.log("TARGET MATCH     :",positions.length);
console.log("KEY/VALUE FOUND  :",found.size);
console.log("PRODUCT URLS     :",productUrls.length);
console.log("PRODUCT CONTEXT  :",types.PRODUCT);

console.log("");
console.log("======================================");
console.log("V11 COMPLETE");
console.log("======================================");
console.log("SOURCE 수정      : NO");
console.log("DB 수정          : NO");
console.log("NETWORK 요청     : NO");
console.log("AI 호출          : NO");
console.log("영상 생성        : NO");
console.log("YouTube 업로드   : NO");
console.log("======================================");
