import { callAI } from "../ai/index.js";

export function normalizeShoppingScenes(director, product) {
  const input=director?.work_instructions?.scenes||director?.scenes||[];
  const valid=Array.isArray(input)?input.filter(s=>s&&typeof (s.tts||s.script)==="string"&&String(s.tts||s.script).trim()):[];
  if(valid.length<4)throw new Error("SHOPPING: 4개 이상의 유익한 상품 설명 장면이 필요합니다.");
  const images=Array.isArray(product.images)?product.images.filter(Boolean):[];
  if(images.length<2 && !(images.length===1 && product.singlePhotoMode===true && product.productMediaVerified===true))
    throw new Error("SHOPPING: 서로 다른 상품 이미지 2장 이상 필요합니다. 단일 사진 정보형은 실제 사진 검증 후에만 허용됩니다.");
  const motion=["zoom_in","zoom_out","slow_zoom","zoom_in","zoom_out","slow_zoom","zoom_in"];
  const moves=["push_in","pull_out","pan_left","pan_right","push_in","pull_out","pan_left"];
  const selected=valid.slice(0,7);
  const occasion=String(product.name||"").match(/수능|합격|생일|졸업|입학|기념일|결혼|어버이날|크리스마스|케이크/)?.[0] || "";
  if(occasion && !selected.some(x=>String(x.tts||x.script||"").includes(occasion))) {
    // Keep the true occasion central instead of a generic gift shopping pitch.
    selected[0]={...selected[0],tts:`${occasion}을 위한 ${product.name}, 어떤 점을 먼저 확인해야 할까요?`};
  }
  return selected.map((s,i)=>({
    type:i===0?"hook":i===Math.min(valid.length,7)-1?"ending":"global",
    sceneType:i===0?"hook":i===Math.min(valid.length,7)-1?"ending":"global",
    visualType:"product",imageQueries:[],
    script:String(s.tts||s.script).trim(),tts:String(s.tts||s.script).trim(),
    subtitle:String(s.subtitle||s.tts||s.script).trim().slice(0,100),
    shot:i%3===0?"closeup":i%3===1?"medium":"wide",
    cameraMove:moves[i%moves.length],motion:motion[i%motion.length],
    transition:"cut",duration:Math.max(2.5,Math.min(6,Number(s.duration)||4)),
    direction:i===0?"hook":i===Math.min(valid.length,7)-1?"cta":(s.direction||"detail"),product
  }));
}

export async function createShoppingDirector(product={}) {
  if(!product.name||!Array.isArray(product.images)||!product.images.length)throw new Error("SHOPPING: 필수 상품/이미지 누락");
  const verified=JSON.stringify({
    name:product.name,description:product.description||"",
    price:product.price||null,provider:product.provider||"coupang",imageCount:product.images.length,
    singlePhotoMode:product.singlePhotoMode===true
  });
  const prompt=[
    "당신은 상품 중심 쇼핑 숏폼 감독이다. 첫 프레임부터 끝까지 동일 상품 사진만 사용한다.",
    product.provider==="kakao-curator"?"카카오 선물하기 큐레이터. 선물 선택 기준과 구성 확인 포인트를 전달한다.":"쿠팡 파트너스. 제품의 쓰임과 구매 전 체크포인트를 전달한다.",
    "1) 첫 2초: 상품 사진과 궁금증 질문. 광고 인사 금지.",
    "2) 중간에 새로 알 만한 정보/선택 기준 2개 이상. 내용 반복 금지.",
    "3) 끝에서 질문에 답하고 실제 추천 링크에서 확인하도록 안내. 사라진 상품 모아보기/프로필 쇼핑 페이지로 안내하지 말 것.",
    "4) 상품명에 수능·합격·케이크·생일 등 특정 목적/행사가 있으면 제목·첫 대사·중간 설명에 그 목적을 정확히 언급. 일반적인 선물 이야기만 하는 것 금지.",
    "5) 상품명·설명에 실제 명시된 정보(크기/구성/수량/맛/포장/행사 등) 최소 두 가지를 정확히 다뤄라. 확인할 수 없는 정보는 확인 필요하다고 말한다.",
    "6) 정확한 모델·규격·특징은 제공 사실만 사용. 효능·실사용 후기·할인·가격·증정품 발명 금지.",
    "5) 건강기능식품의 치료/예방 주장 금지.",
    "6) 5~7장면, 장면당 한국어 음성 1~2문장, 총 25~40초, 장면마다 2~6초.",
    "7) 무조건 등록된 실제 product 이미지. 무료 이미지 검색, 인물·배경·가상 후기 장면 금지.",
    "8) 실제 사진에 줌인/줌아웃/좌우이동/클로즈업을 교차 적용.",
    product.singlePhotoMode === true ? "주의: 실제 상품 사진이 단 1장이다. 사진을 반복해서 쓰는 정보형 비교/구매 체크리스트 숏폼으로 연출하고, 서로 다른 각도 사진이나 실제 테스트/후기가 있는 듯 주장하지 마라. 장면 간 자막 정보와 카메라 움직임을 차별화한다." : "여러 실제 상품 사진을 장면에 적절히 사용한다.",
    "9) JSON만 응답.","입력 사실:",verified,
    '출력 JSON: {"title":"제목","description":"","work_instructions":{"scenes":[{"type":"hook","tts":"한국어 대본","subtitle":"짧은 핵심 자막","duration":4,"direction":"hook"}]}}'
  ].join("\n");
  const raw=await callAI(prompt);
  const clean=String(raw).replace(/^\s*`+(?:json)?/i,"").replace(/`+\s*$/,"").trim();
  const director=JSON.parse(clean);
  director.scenes=normalizeShoppingScenes(director,product);
  director.description=String(director.description||"");
  return director;
}
