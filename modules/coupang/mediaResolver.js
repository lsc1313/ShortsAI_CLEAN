import fs from "fs/promises";
const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language":
    "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"
};

async function fetchDetailPage(detailUrl, referer = "") {

  const response = await fetch(detailUrl, {
    headers:{
      ...DEFAULT_HEADERS,
      Referer:referer
    },
    redirect:"follow"
  });

  if(!response.ok){
    throw new Error(`DETAIL PAGE HTTP ${response.status}`);
  }

  return await response.text();
}

function unique(list){
  return [...new Set(list.filter(Boolean))];
}

function normalize(url){

  url = String(url || "").trim();

  if(!url) return "";

  if(url.startsWith("//")){
    url = "https:" + url;
  }

  if(url.startsWith("http://")){
    url = "https://" + url.slice(7);
  }

  return url;
}

function extractImages(html){

  const images=[];

  const patterns=[

    /https?:\/\/[^"' ]+\.(jpg|jpeg|png|webp)(\?[^"' ]*)?/ig,

    /\/\/[^"' ]+\.(jpg|jpeg|png|webp)(\?[^"' ]*)?/ig

  ];

  for(const pattern of patterns){

    let m;

    while((m=pattern.exec(html))!==null){

      const url=normalize(m[0]);

      if(
        url &&
        !url.includes("icon") &&
        !url.includes("sprite") &&
        !url.includes("logo")
      ){
        images.push(url);
      }

    }

  }

  return unique(images);
}

function extractVideos(html){

  const videos=[];

  const patterns=[

    /https?:\/\/[^"' ]+\.mp4(\?[^"' ]*)?/ig,

    /\/\/[^"' ]+\.mp4(\?[^"' ]*)?/ig

  ];

  for(const pattern of patterns){

    let m;

    while((m=pattern.exec(html))!==null){

      videos.push(normalize(m[0]));

    }

  }

  return unique(videos);
}

export async function resolveProductMedia(product){

  const detailHtml=await fetchDetailPage(
    product.detailUrl,
    product.partnerUrl
  );

await saveDebugHtml(detailHtml);

  const detailImages=extractImages(detailHtml);

  const detailVideos=extractVideos(detailHtml);

  return{

    ...product,

    detailHtml,

    detailImages,

    detailVideos

  };

}

export default{
  resolveProductMedia
};

import fs from "fs/promises";

async function saveDebugHtml(html){
  await fs.mkdir("temp",{recursive:true});
  await fs.writeFile("temp/coupang_detail.html", html, "utf8");
}

async function saveDebugHtml(html){

    await fs.mkdir("temp",{
        recursive:true
    });

    await fs.writeFile(
        "temp/coupang_detail.html",
        html,
        "utf8"
    );

}

import fs from "fs/promises";

async function saveDebugHtml(html){

    await fs.mkdir("temp",{
        recursive:true
    });

    await fs.writeFile(
        "temp/coupang_detail.html",
        html,
        "utf8"
    );

}
