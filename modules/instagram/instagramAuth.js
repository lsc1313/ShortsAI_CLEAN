import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const STORE = path.resolve(".runtime/social-auth/instagram.json");
const CHANNELS = path.resolve("modules/channels/channels.json");
const DAY = 24 * 3600 * 1000;
const REFRESH_WINDOW = 15 * DAY;
const GRAPH = "https://graph.instagram.com";
const AUTH = "https://www.instagram.com/oauth/authorize";
const EXCHANGE = "https://api.instagram.com/oauth/access_token";
const CALLBACK = String(process.env.INSTAGRAM_REDIRECT_URI || "http://localhost:3000/api/instagram-auth/callback").trim();

// Keep credentials out of Git, channel JSON and HTTP responses.
function readStore() {
  try {
    const data = JSON.parse(fs.readFileSync(STORE, "utf8"));
    return typeof data === "object" && data ? data : {};
  } catch (e) {
    if (e.code === "ENOENT") return {};
    throw new Error("Instagram 인증 저장소를 읽을 수 없습니다: " + e.message);
  }
}
function persist(data) {
  fs.mkdirSync(path.dirname(STORE), {recursive:true});
  const tmp = STORE + "." + process.pid + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), {encoding:"utf8",mode:0o600});
  fs.renameSync(tmp, STORE);
}
export function listInstagramChannels() {
  try {
    const json = JSON.parse(fs.readFileSync(CHANNELS,"utf8"));
    return (Array.isArray(json) ? json : []).filter(c => c.instagram?.enabled === true)
      .map(c => ({
        channel: String(c.name || ""),
        username: String(c.instagram.username || ""),
        userId: String(c.instagram.instagramUserId || "")
      })).filter(c => c.username && c.userId);
  } catch (e) {
    console.warn("[INSTAGRAM AUTH] 채널 목록 읽기 실패:",e.message);
    return [];
  }
}
export function getInstagramAuthStatuses() {
  const data=readStore();
  return listInstagramChannels().map(c => {
    const saved=data[c.userId];
    const expiry=saved?.expiresAt ? Date.parse(saved.expiresAt) : NaN;
    return {
      ...c,
      status: saved?.accessToken
        ? (Number.isFinite(expiry) && expiry < Date.now() ? "expired" : "connected")
        : "reauthorization-needed",
      expiresAt: saved?.expiresAt || null,
      managed: Boolean(saved?.accessToken)
    };
  });
}
export function configStatus() {
  return {
    configured: Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET && process.env.INSTAGRAM_REDIRECT_URI && /^https:\/\//.test(CALLBACK)),
    redirectUri: CALLBACK,
    missing: [
      ...(!process.env.INSTAGRAM_APP_ID ? ["INSTAGRAM_APP_ID"] : []),
      ...(!process.env.INSTAGRAM_APP_SECRET ? ["INSTAGRAM_APP_SECRET"] : []),
      ...(!process.env.INSTAGRAM_REDIRECT_URI || !/^https:\/\//.test(CALLBACK) ? ["INSTAGRAM_REDIRECT_URI (등록된 HTTPS 콜백 URL)"] : [])
    ]
  };
}
const pending=new Map();
export function createAuthorizationUrl(userId) {
  const c=listInstagramChannels().find(x=>x.userId===String(userId));
  if(!c) throw new Error("기존 인스타그램 채널을 찾을 수 없습니다.");
  if(!configStatus().configured) throw new Error("Instagram 앱의 INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET 및 등록된 HTTPS INSTAGRAM_REDIRECT_URI 설정이 필요합니다.");
  const state=crypto.randomBytes(24).toString("hex");
  pending.set(state,{userId:c.userId,username:c.username,createdAt:Date.now()});
  const url=new URL(AUTH);
  url.searchParams.set("client_id",process.env.INSTAGRAM_APP_ID);
  url.searchParams.set("redirect_uri",CALLBACK);
  url.searchParams.set("response_type","code");
  url.searchParams.set("scope","instagram_business_basic,instagram_business_content_publish");
  url.searchParams.set("state",state);
  url.searchParams.set("force_reauth","true");
  return url.toString();
}
async function jsonResponse(response, context) {
  let data;
  try {data=await response.json();}catch {throw new Error(context+" 응답이 JSON 형식이 아닙니다.");}
  if (!response.ok || data.error) throw new Error(context+" 실패: "+String(data.error?.message||data.error_description||response.status).slice(0,250));
  return data;
}
export async function finalizeInstagramAuthorization({state,code},fetchImpl=fetch) {
  const pendingAuth=pending.get(String(state||""));
  pending.delete(String(state||""));
  if(!pendingAuth || Date.now()-pendingAuth.createdAt>10*60*1000) throw new Error("승인 요청이 만료됐습니다. 재연결 버튼을 다시 누르세요.");
  if(!code) throw new Error("Instagram에서 인증 코드가 전달되지 않았습니다.");
  const form=new URLSearchParams({
    client_id:process.env.INSTAGRAM_APP_ID||"",
    client_secret:process.env.INSTAGRAM_APP_SECRET||"",
    grant_type:"authorization_code",
    redirect_uri:CALLBACK,
    code:String(code).replace(/#_$/,"")
  });
  const short=await jsonResponse(await fetchImpl(EXCHANGE,{
    method:"POST",
    body:form,
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    signal:AbortSignal.timeout(15000)
  }),"인스타그램 단기 토큰 교환");
  const shortToken=short.access_token || (Array.isArray(short.data)&&short.data.length===1?short.data[0].access_token:null);
  if(!shortToken) throw new Error("인스타그램 단기 토큰을 받지 못했습니다.");
  const exchange=new URL(GRAPH+"/access_token");
  exchange.searchParams.set("grant_type","ig_exchange_token");
  exchange.searchParams.set("client_secret",process.env.INSTAGRAM_APP_SECRET);
  exchange.searchParams.set("access_token",shortToken);
  const long=await jsonResponse(await fetchImpl(exchange,{signal:AbortSignal.timeout(15000)}),"인스타그램 장기 토큰 교환");
  if(!long.access_token || !Number(long.expires_in)) throw new Error("장기 토큰 또는 만료 정보를 받지 못했습니다.");
  const me=new URL(GRAPH+"/me");
  me.searchParams.set("fields","user_id,username");
  me.searchParams.set("access_token",long.access_token);
  const account=await jsonResponse(await fetchImpl(me,{signal:AbortSignal.timeout(15000)}),"인스타그램 계정 검증");
  if(String(account.username||"").toLowerCase() !== pendingAuth.username.toLowerCase()) {
    throw new Error("승인한 인스타그램 계정이 기존 채널 ("+pendingAuth.username+")과 다릅니다. 저장하지 않았습니다.");
  }
  if(account.user_id && String(account.user_id)!==pendingAuth.userId && String(account.id||"")!==pendingAuth.userId) {
    throw new Error("승인한 Instagram 사용자 ID가 채널 설정과 다릅니다. 저장하지 않았습니다.");
  }
  const store=readStore();
  store[pendingAuth.userId]={
    username:pendingAuth.username,
    accessToken:long.access_token,
    expiresAt:new Date(Date.now()+Number(long.expires_in)*1000).toISOString(),
    updatedAt:new Date().toISOString()
  };
  persist(store);
  return {username:pendingAuth.username,userId:pendingAuth.userId};
}
const refreshing=new Map();
export async function getInstagramToken(userId,legacyToken,fetchImpl=fetch) {
  const id=String(userId||"");
  const data=readStore();
  const item=data[id];
  if(!item?.accessToken) return legacyToken;
  const expiration=Date.parse(item.expiresAt);
  if(Number.isFinite(expiration)&& expiration<=Date.now()) {
    throw new Error("Instagram 인증이 만료되었습니다. ShortsAI 관리화면에서 재연결하세요.");
  }
  if (!Number.isFinite(expiration) || expiration-Date.now()>REFRESH_WINDOW) return item.accessToken;
  if(refreshing.has(id)) return refreshing.get(id);
  const pendingRefresh=(async()=>{
    try {
      const url=new URL(GRAPH+"/refresh_access_token");
      url.searchParams.set("grant_type","ig_refresh_token");
      url.searchParams.set("access_token",item.accessToken);
      const result=await jsonResponse(await fetchImpl(url,{signal:AbortSignal.timeout(15000)}),"Instagram 토큰 자동 갱신");
      if(!result.access_token||!Number(result.expires_in)) throw new Error("갱신 응답에 토큰/만료 시간이 없습니다.");
      const latest=readStore();
      latest[id]={...item,accessToken:result.access_token,expiresAt:new Date(Date.now()+Number(result.expires_in)*1000).toISOString(),updatedAt:new Date().toISOString()};
      persist(latest);
      return result.access_token;
    } catch(error) {
      console.error("[INSTAGRAM AUTH] 자동 갱신 실패:",error.message);
      // Never throw away an unexpired working token on a transient network failure.
      return item.accessToken;
    }
  })().finally(()=>refreshing.delete(id));
  refreshing.set(id,pendingRefresh);
  return pendingRefresh;
}
export async function refreshInstagramTokens() {
  const values=readStore();
  await Promise.all(Object.keys(values).map(id=>getInstagramToken(id,null).catch(e=>console.error("[INSTAGRAM AUTH]",id,e.message))));
}
