/**
 * Public Coupang product-page gallery collector.
 *
 * The affiliate search API supplies a single hero thumbnail; the MLP redirect
 * often returns marketing shell HTML, not an ID-matched product JSON object.
 * Read the real public product gallery DOM instead, only when identity agrees
 * with the exact SKU selected by the affiliate API. Never scrape recommendations.
 */
function isCoupangHost(host) {
  return host==="coupang.com" || host.endsWith(".coupang.com");
}
export function productPageMatches(url, productId) {
  try {
    const u=new URL(url);
    const id=String(productId||"").trim();
    return u.protocol==="https:" && isCoupangHost(u.hostname) &&
      /^\d+$/.test(id) && (
        u.searchParams.get("productId")===id ||
        u.searchParams.get("pageKey")===id ||
        u.pathname.split("/").includes(id)
      );
  }catch{return false;}
}
/**
 * Affiliate URLs may point to a marketing redirect rather than the real page.
 * Build the official Coupang product page solely from a numeric ID supplied by
 * the affiliate API, preserving the same itemId when present in that URL.
 */
export function officialProductPageUrl(productId,rawUrl) {
  const id=String(productId||"").trim();
  if(!/^\d+$/.test(id))return "";
  if(productPageMatches(rawUrl,id))return rawUrl;
  let itemId="";
  try {
    const parsed=new URL(String(rawUrl||""));
    if(parsed.protocol==="https:" && isCoupangHost(parsed.hostname)) {
      const candidate=parsed.searchParams.get("itemId")||"";
      if(/^\d+$/.test(candidate))itemId=candidate;
    }
  }catch{}
  const canonical=new URL("https://www.coupang.com/vp/products/"+id);
  if(itemId)canonical.searchParams.set("itemId",itemId);
  return canonical.href;
}
function normalizedImage(value,pageUrl) {
  try {
    const url=new URL(String(value||"").trim(),pageUrl);
    if(url.protocol!=="https:" || url.username || url.password) return "";
    const host=url.hostname.toLowerCase();
    if(host==="localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host))return "";
    if(!host.includes(".") || /(?:logo|icon|badge|sprite|pixel|tracking|avatar)/i.test(url.pathname))return "";
    return url.href;
  }catch{return "";}
}
export function validateGalleryResult(result,{productId,pageUrl}){
  const url=String(result?.finalUrl||"");
  if(!productPageMatches(pageUrl,productId) || !productPageMatches(url,productId)) {
    return {images:[],verified:false,reason:"product-page-identity-mismatch"};
  }
  const images=[...new Set((Array.isArray(result?.images)?result.images:[])
    .map(src=>normalizedImage(src,url)).filter(Boolean))].slice(0,12);
  // Page URL identity alone does not prove that any real product media was found.
  if(images.length===0){
    const blocked=Boolean(result?.accessChallenge);
    return {images:[],verified:false,reason:blocked?"page-access-challenge":"gallery-empty"};
  }
  return {images,verified:true,reason:"product-gallery"};
}

async function renderedProductGallery(pageUrl,{timeout=12000}={}) {
  const {default:puppeteer}=await import("puppeteer");
  let browser;
  try {
    browser=await puppeteer.launch({
      headless:true,
      args:["--disable-gpu","--disable-dev-shm-usage","--no-sandbox","--disable-setuid-sandbox"]
    });
    const page=await browser.newPage();
    page.setDefaultNavigationTimeout(timeout);
    // Do not work around login walls, bot challenges or access controls.
    await page.goto(pageUrl,{waitUntil:"domcontentloaded",timeout});
    await new Promise(resolve=>setTimeout(resolve,900));
    const finalUrl=page.url();
    // Product pages may hydrate the thumbnails well after DOMContentLoaded.
    // Retry boundedly; never bypass access restrictions or follow unrelated pages.
    let gallery={images:[],matchedSelectors:0,domImageCount:0,structuredProducts:0};
    for(let attempt=0;attempt<4;attempt++){
      gallery=await page.evaluate((expectedId)=>{
        const containers=[
          ".prod-image",'[class*="prod-image__"]',
          "#repImageContainer","#prod-image",
          '[data-testid="product-image-gallery"]',
          '[class*="product-image-gallery"]',
          '[class*="ProductImageGallery"]',
          '[class*="productImageGallery"]',
          '[class*="product-gallery"]',
          '[class*="thumbnail-list"]',
          '[class*="thumbnailList"]'
        ];
        const urls=[],hitSelectors=[];
        const add=value=>{if(typeof value==="string"&&value.trim())urls.push(value.trim())};
        const banned='[class*="recommend"],[class*="related"],[class*="sponsor"],[class*="advert"]';
        for(const selector of containers){
          const nodes=[...document.querySelectorAll(selector)].filter(el=>!el.closest(banned));
          if(nodes.length)hitSelectors.push(selector);
          for(const el of nodes){
            const imgs=el.matches("img")?[el]:[...el.querySelectorAll("img")];
            for(const img of imgs){
              for(const attr of [
                "data-origin","data-origin-src","data-zoom-image","data-img-src",
                "data-image","data-image-url","data-src","data-lazy-src","src"
              ]) add(img.getAttribute(attr));
              add(img.currentSrc);
              const srcset=img.getAttribute("srcset");
              if(srcset)for(const item of srcset.split(","))add(item.trim().split(/\\s+/)[0]);
            }
            for(const item of el.querySelectorAll("[data-image],[data-src],[data-origin],[data-zoom-image]")){
              for(const attr of ["data-image","data-src","data-origin","data-zoom-image"])add(item.getAttribute(attr));
            }
          }
        }
        // Structured product image arrays offer a stable alternative to CSS
        // classes, but only when their explicit product identifier matches.
        let structuredProducts=0;
        const productNodes=[];
        function collect(node,depth=0){
          if(!node||typeof node!=="object"||depth>5)return;
          if(Array.isArray(node)){for(const v of node)collect(v,depth+1);return;}
          const types=[].concat(node["@type"]||[]).map(x=>String(x).toLowerCase());
          if(types.includes("product"))productNodes.push(node);
          if(node["@graph"])collect(node["@graph"],depth+1);
          if(node.mainEntity)collect(node.mainEntity,depth+1);
        }
        for(const script of document.querySelectorAll('script[type="application/ld+json"]')){
          try{collect(JSON.parse(script.textContent||""));}catch{}
        }
        for(const node of productNodes){
          structuredProducts++;
          const identifiers=[node.productID,node.productId,node.sku,node.mpn,
            node["@id"],node.url].map(x=>String(x||""));
          const matched=identifiers.some(x=>
            x===expectedId ||
            x.includes("/products/"+expectedId) ||
            x.includes("productId="+expectedId)
          );
          if(!matched)continue;
          const photos=[].concat(node.image||[]);
          for(const photo of photos){
            if(typeof photo==="string")add(photo);
            else if(photo && typeof photo==="object")add(photo.url||photo.contentUrl);
          }
        }
        const body=(document.body?.innerText||"").slice(0,2000).toLowerCase();
        const accessChallenge=/captcha|보안문자|비정상적인 접근|접근이 제한|access denied|robot check|verify you are human/.test(body);
        return {
          images:[...new Set(urls)],
          matchedSelectors:hitSelectors.length,
          domImageCount:document.images.length,
          structuredProducts,
          accessChallenge
        };
      },new URL(pageUrl).pathname.split("/").filter(Boolean).at(-1));
      if(gallery.images.length>=4||gallery.accessChallenge)break;
      if(attempt<3)await new Promise(resolve=>setTimeout(resolve,1000));
    }
    return {
      finalUrl,
      images:gallery.images,
      matchedSelectors:gallery.matchedSelectors,
      domImageCount:gallery.domImageCount,
      structuredProducts:gallery.structuredProducts,
      accessChallenge:gallery.accessChallenge
    };
  }finally{
    if(browser)await browser.close().catch(()=>{});
  }
}

export async function collectCoupangGallery({productId,pageUrl},{visit=renderedProductGallery,logger=console}={}){
  if(!productPageMatches(pageUrl,productId)) {
    logger.warn("[COUPANG BROWSER GALLERY]",{
      productId:String(productId),verified:false,candidateCount:0,
      reason:"invalid-official-product-url"
    });
    return {images:[],verified:false,reason:"invalid-official-product-url"};
  }
  try {
    const result=await visit(pageUrl);
    const checked=validateGalleryResult(result,{productId,pageUrl});
    logger.log("[COUPANG BROWSER GALLERY]",{
      productId:String(productId),verified:checked.verified,
      candidateCount:checked.images.length,matchedSelectors:Number(result.matchedSelectors||0),
      domImageCount:Number(result.domImageCount||0),structuredProducts:Number(result.structuredProducts||0),
      accessChallenge:Boolean(result.accessChallenge),reason:checked.reason
    });
    return checked;
  }catch(error) {
    const message=String(error?.message||error);
    logger.warn("[COUPANG BROWSER GALLERY]",{
      productId:String(productId),
      reason:/timeout/i.test(message)?"navigation-timeout":
        /executable|chrome|browser/i.test(message)?"browser-unavailable":
        "page-unavailable"
    });
    return {images:[],verified:false,reason:"gallery-collection-unavailable"};
  }
}
