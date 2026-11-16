import { discoverProductPage, stageProductImages } from "../shopping/productMedia.js";
import { isCuratorLink, saveCuratorProduct } from "./store.js";

export async function enrichCuratorProduct(product) {
  if (!isCuratorLink(product.partnerUrl)) throw new Error("Invalid curator link");
  const details=await discoverProductPage(product.partnerUrl,{expectedName:product.name||""});
  if(!details.verified)return product;
  const updated={
    ...product,
    name:product.name||details.name,
    description:product.description||details.description,
    price:product.price||details.price,
    images:[...new Set([...(product.images||[]),...details.images])].slice(0,12),
    mediaSource:details.source
  };
  // Preserve the user's issued affiliate link and known identity.
  return saveCuratorProduct(updated);
}
export async function prepareCuratorProduct(product) {
  const enriched=await enrichCuratorProduct(product);
  if(!enriched.name||!enriched.images?.length)
    throw new Error("큐레이터 상세정보 또는 사진을 확보하지 못해 업로드를 보류합니다.");
  return stageProductImages(enriched,enriched.images,{maxImages:6});
}
