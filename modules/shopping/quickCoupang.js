import { searchProducts, createPartnerLink } from "../coupang/index_api.js";
import { resolveCoupangProduct } from "../coupang/productResolver.js";
import { prepareShoppingProduct } from "./productMedia.js";

/**
 * UI QUICK must verify a candidate BEFORE starting Brain. A product whose
 * genuine, distinct photos cannot be obtained is never sent for publication.
 * Keeping one candidate per attempt also prevents mixing other SKUs' photos.
 */
export async function chooseQuickCoupangProduct(keyword, {
  search = searchProducts,
  partnerLink = createPartnerLink,
  resolve = resolveCoupangProduct,
  prepare = prepareShoppingProduct,
  logger = console,
  maxCandidates = 8
} = {}) {
  const term = String(keyword || "").trim();
  if (!term) throw new Error("검색어가 없습니다.");

  const limit = Math.min(10, Math.max(1, Math.trunc(Number(maxCandidates) || 8)));
  const candidates = await search(term, limit);
  if (!Array.isArray(candidates) || !candidates.length) {
    throw new Error("쿠팡에서 해당 검색어의 유효한 상품을 찾지 못했습니다.");
  }

  const attempts = [];
  const singlePhotoCandidates = [];
  for (const [index, selected] of candidates.slice(0,limit).entries()) {
    const productName = String(selected?.title || selected?.name || "").trim();
    const productId = String(selected?.productId || "").trim();
    if (!productName || !selected?.url || !selected?.image) continue;
    try {
      logger.log(`[SHOPPING QUICK] 후보 ${index+1}/${Math.min(candidates.length,limit)} 검증: ${productName}`);
      const partnerUrl = await partnerLink(selected.url);
      if (!partnerUrl) throw new Error("쿠팡 파트너스 링크 생성 실패");

      // Best-effort resolver. Its identity-matched gallery is used only when
      // a matching exact product is resolved. Never use a different SKU.
      let detail = null;
      try {
        const result = await resolve({
          name: productName,
          partnerUrl,
          images: [selected.image],
          keyword: term
        });
        if (result?.resolved === true) detail = result;
      } catch(error) {
        logger.warn("[SHOPPING QUICK] 상세 갤러리 조회 불가:",String(error.message || error).slice(0,140));
      }

      const candidate = {
        id: productId || `quick_${index+1}`,
        name: detail?.productTitle || productName,
        keyword: term,
        description: Array.isArray(detail?.attributes)
          ? detail.attributes.filter(x=>x?.type && x?.value).map(x=>`${x.type}: ${x.value}`).join("; ")
          : "",
        price: Number(detail?.price) || Number(selected.price),
        partnerUrl,
        sourceUrl: detail?.detailUrl || selected.url,
        provider: "coupang",
        images: [selected.image],
        galleryImages: detail?.galleryImages || [],
        publicImages: [selected.image],
        enabled: true
      };

      // Strict pass first: exhaust possible distinct multi-photo products.
      // Keep a candidate for a second, clearly marked one-photo pass.
      singlePhotoCandidates.push({candidate,selectedIndex:index+1});
      const product = await prepare(candidate);
      if (product?.productMediaVerified !== true || !Array.isArray(product?.images) || product.images.length < 2) {
        throw new Error("SHOPPING_MEDIA_INSUFFICIENT: 같은 상품의 서로 다른 실제 사진이 2장 미만");
      }
      logger.log("[SHOPPING QUICK] 이미지 검증 통과:",{
        productId,
        candidate: index+1,
        distinctPhotos: product.images.length,
        mediaSource: product.mediaSource || "gallery"
      });
      return { product, selectedIndex: index+1, inspected: index+1 };
    } catch (error) {
      const reason = String(error?.message || error);
      attempts.push({ productId, name: productName, reason:reason.slice(0,180) });
      logger.warn(`[SHOPPING QUICK] 후보 제외 ${index+1}:`,reason.slice(0,200));
      // A candidate failure cannot poison the whole manual search. Limit to
      // the finite candidate set; no unbounded retries or identity mismatch.
    }
  }

  // Coupang often provides only the official hero image. Once all products
  // fail the strict gallery requirement, use one genuine product photo with
  // camera movement / informational overlays; never claim it is two photos.
  for (const {candidate,selectedIndex} of singlePhotoCandidates) {
    try {
      const product=await prepare(candidate,{allowSinglePhoto:true});
      if (product?.productMediaVerified !== true ||
          !Array.isArray(product.images) || product.images.length < 1 ||
          (product.images.length === 1 && product.singlePhotoMode !== true)) {
        throw new Error("SHOPPING: 실제 사진 1장 검증 실패");
      }
      logger.warn("[SHOPPING QUICK] 실제 상품 사진 1장 정보형 쇼츠로 제작:",{
        productId:candidate.id,selectedIndex,distinctPhotos:product.distinctPhotoCount ?? product.images.length
      });
      return {product,selectedIndex,inspected:Math.min(candidates.length,limit)};
    } catch (error) {
      logger.warn("[SHOPPING QUICK] 단일 사진 후보 제외:",candidate.name,String(error?.message||error).slice(0,150));
    }
  }

  logger.warn("[SHOPPING QUICK] 후보 전체 미통과:",attempts);
  const summary=attempts.slice(0,4).map(x=>`${x.name}: ${x.reason}`).join(" / ");
  throw new Error(
    `SHOPPING_MEDIA_INSUFFICIENT: ${Math.min(candidates.length,limit)}개 쿠팡 상품을 확인했지만 서로 다른 실제 상품 사진 2장 이상인 후보가 없고 실제 사진 1장 정보형 대체 제작도 불가능합니다.`+
    (summary ? " (예: "+summary.slice(0,260)+")" : "")
  );
}
