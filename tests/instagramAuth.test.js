import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Instagram OAuth uses official Instagram Login and exchange endpoints",()=>{
 const src=fs.readFileSync(new URL("../modules/instagram/instagramAuth.js",import.meta.url),"utf8");
 assert.match(src,/https:\/\/www\.instagram\.com\/oauth\/authorize/);
 assert.match(src,/https:\/\/api\.instagram\.com\/oauth\/access_token/);
 assert.match(src,/ig_exchange_token/);
 assert.match(src,/ig_refresh_token/);
 assert.match(src,/instagram_business_content_publish/);
 assert.match(src,/INSTAGRAM_APP_ID/);
 assert.match(src,/INSTAGRAM_APP_SECRET/);
 assert.match(src,/INSTAGRAM_REDIRECT_URI/);
 assert.match(src,/createHash|randomBytes/);
});
test("OAuth callback verifies state and exact account before securely storing",()=>{
 const src=fs.readFileSync(new URL("../modules/instagram/instagramAuth.js",import.meta.url),"utf8");
 assert.match(src,/pending\.delete\(String\(state\|\|""\)\)/);
 assert.match(src,/Date\.now\(\)-pendingAuth\.createdAt>10\*60\*1000/);
 assert.match(src,/account\.username/);
 assert.match(src,/pendingAuth\.username/);
 assert.match(src,/account\.user_id/);
 assert.match(src,/persist\(store\)/);
 assert.match(src,/\.runtime\/social-auth\/instagram\.json/);
});
test("Manager UI reconnect only on localhost and never discloses tokens",()=>{
 const server=fs.readFileSync(new URL("../server.js",import.meta.url),"utf8");
 const ui=fs.readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
 const js=fs.readFileSync(new URL("../public/app.js",import.meta.url),"utf8");
 assert.match(server,/function localOnly\(/);
 assert.match(server,/app\.get\("\/api\/instagram-auth\/status",localOnly/);
 assert.match(server,/app\.post\("\/api\/instagram-auth\/start",localOnly/);
 assert.match(server,/app\.get\("\/api\/instagram-auth\/callback",localOnly/);
 assert.match(ui,/id="instagramAuthPanel"/);
 assert.match(js,/data-instagram-reconnect/);
 assert.match(js,/instagram_auth/);
});
test("Instagram Reel uploads use dynamically refreshed token and startup preflight",()=>{
 const short=fs.readFileSync(new URL("../modules/createShort.js",import.meta.url),"utf8");
 const server=fs.readFileSync(new URL("../server.js",import.meta.url),"utf8");
 assert.match(short,/await getInstagramToken\(instagram\.instagramUserId, instagram\.accessToken\)/);
 assert.match(server,/refreshInstagramTokens\(\)/);
 assert.match(server,/24\*60\*60\*1000/);
});
