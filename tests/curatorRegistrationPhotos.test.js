import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Curator registration uses a mobile multi-image picker as its primary field",()=>{
 const html=fs.readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
 assert.match(html,/id="curatorPhotoFiles" type="file"/);
 assert.match(html,/accept="image\/jpeg,image\/png,image\/webp" multiple/);
 assert.match(html,/id="curatorPhotoPreview"/);
 assert.match(html,/<details[\s\S]*?<summary[^>]*>고급 옵션/);
 assert.ok(html.indexOf('id="curatorPhotoFiles"') < html.indexOf('id="curatorImages"'));
});
test("New curator product uploads selected photos immediately after link registration",()=>{
 const ui=fs.readFileSync(new URL("../public/app.js",import.meta.url),"utf8");
 assert.match(ui,/registered = await request\("\/curator\/products","POST",\{name,partnerUrl,images\}\)/);
 assert.match(ui,/const uploaded = await uploadPhotos\(productId, files\)/);
 assert.match(ui,/form\.reset\(\);\s*renderPhotoPreview\(\)/);
 assert.match(ui,/if \(files\.length > 12\)/);
 assert.match(ui,/15 \* 1024 \* 1024/);
 assert.match(ui,/URL\.revokeObjectURL\(url\)/);
});
test("Existing curator items retain photo uploader and API",()=>{
 const server=fs.readFileSync(new URL("../server.js",import.meta.url),"utf8");
 const ui=fs.readFileSync(new URL("../public/app.js",import.meta.url),"utf8");
 assert.match(server,/app\.post\("\/curator\/products\/:id\/images"/);
 assert.match(ui,/data-curator-action="upload"/);
});
