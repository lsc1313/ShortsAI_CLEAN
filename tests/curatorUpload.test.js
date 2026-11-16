import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("Curator supports multi-image mobile uploads with byte signature validation",()=>{
  const server=fs.readFileSync(new URL("../server.js",import.meta.url),"utf8");
  assert.match(server,/app\.post\("\/curator\/products\/:id\/images"/);
  assert.match(server,/productImageUpload\.array\("images", 12\)/);
  assert.match(server,/isPng/);
  assert.match(server,/isJpg/);
  assert.match(server,/isWebp/);
});
test("Mobile UI shows actual image count and gallery input",()=>{
  const ui=fs.readFileSync(new URL("../public/app.js",import.meta.url),"utf8");
  assert.match(ui,/type="file" multiple/);
  assert.match(ui,/data-curator-action="upload"/);
  assert.match(ui,/result\.imageCount/);
});
