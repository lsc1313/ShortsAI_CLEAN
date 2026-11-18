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
  // A generic marketing shell must not be treated as a product detail page.
  if(!productPageMatches(pageUrl,productId) || !productPageMatches(url,productId)) {
    return {images:[],verified:false,reason:"product-page-identity-mismatch"};
  }
  const images=[...new Set((Array.isArray(result?.images)?result.images:[])
    .map(src=>normalizedImage(src,url)).filter(Boolean))].slice(0,12);
  return {images,verified:true,reason:images.length?"product-gallery":"gallery-empty"};
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
    const gallery=await page.evaluate(()=>{
      const containers=[
        ".prod-image", '[class*="prod-image__"]',
        "#repImageContainer", "#prod-image",
        '[data-testid="product-image-gallery"]',
        '[class*="product-image-gallery"]',
        '[class*="ProductImageGallery"]',
        '[class*="productImageGallery"]',
        '[class*="product-gallery"]',
        '[class*="thumbnail-list"]',
        '[class*="thumbnailList"]'
      ];
      const urls=[], hitSelectors=[];
      const add=x=>{if(x&&typeof x==="string")urls.push(x)};
      const banned='[class*="recommend"],[class*="related"],[class*="sponsor"],[class*="advert"]';
      for(const selector of containers){
        const nodes=[...document.querySelectorAll(selector)].filter(el=>!el.closest(banned));
        if(nodes.length)hitSelectors.push(selector);
        for(const element of nodes){
          const imgs=element.matches("img")?[element]:[...element.querySelectorAll("img")];
          for(const img of imgs){
            for(const attr of [
              "data-origin","data-origin-src","data-zoom-image","data-img-src",
              "data-image","data-image-url","data-src","data-lazy-src","src"
            ])add(img.getAttribute(attr));
            for(const key of ["currentSrc","src"])add(img[key]);
            const srcset=img.getAttribute("srcset");
            if(srcset)for(const part of srcset.split(","))add(part.trim().split(/\\s+/)[0]);
          }
          for(const node of element.querySelectorAll("[data-image],[data-src],[data-origin],[data-zoom-image]")){
            for(const attr of ["data-image","data-src","data-origin","data-zoom-image"])add(node.getAttribute(attr));
          }
        }
      }
      return {images:[...new Set(urls)],matchedSelectors:hitSelectors.length};
    });
    return {finalUrl,images:gallery.images,matchedSelectors:gallery.matchedSelectors};
  }finally{
    if(browser)await browser.close().catch(()=>{});
  }
}

export async function collectCoupangGallery({productId,pageUrl},{visit=renderedProductGallery,logger=console}={}){
  if(!productPageMatches(pageUrl,productId)) {
    return {images:[],verified:false,reason:"invalid-official-product-url"};
  }
  try {
    const result=await visit(pageUrl);
    const checked=validateGalleryResult(result,{productId,pageUrl});
    logger.log("[COUPANG BROWSER GALLERY]",{
      productId:String(productId),verified:checked.verified,
      candidateCount:checked.images.length,matchedSelectors:Number(result.matchedSelectors||0),reason:checked.reason
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
