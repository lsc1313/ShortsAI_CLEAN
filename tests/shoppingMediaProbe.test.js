import test from "node:test";
import assert from "node:assert/strict";
import {probeCoupangProductMedia} from "../modules/shopping/mediaProbe.js";

const quiet={log(){},warn(){}};
const jpeg=seed=>{const b=Buffer.alloc(1400,seed);b[0]=0xff;b[1]=0xd8;return b;};
const images=[0,1,2,3,4].map(i=>"https://thumbnail.coupangcdn.com/test"+i+".jpg");
test("four real distinct image buffers give a ready report without writing files",async()=>{
 const r=await probeCoupangProductMedia({productId:"7491072451",itemId:"28714411765",heroUrl:images[0]},{
   collect:async()=>({verified:true,reason:"product-gallery",images:images.slice(1)}),
   download:async(url)=>({data:jpeg(images.indexOf(url)+1)}),
   logger:quiet
 });
 assert.equal(r.status,"ready");
 assert.equal(r.distinctPhotos,5);
 assert.equal(r.photos.length,5);
 assert.equal(r.photos[0].source,"official-hero");
 assert.match(r.officialUrl,/itemId=28714411765/);
});
test("access challenge is not reported as a successful media collection",async()=>{
 const r=await probeCoupangProductMedia({productId:"7491072451",heroUrl:images[0]},{
   collect:async()=>({verified:false,reason:"page-access-challenge",images:[]}),
   download:async()=>({data:jpeg(1)}),
   logger:quiet
 });
 assert.equal(r.status,"page-access-challenge");
 assert.equal(r.distinctPhotos,1);
});
test("byte-identical images count once, even under different URLs",async()=>{
 const r=await probeCoupangProductMedia({productId:"7491072451"},{
   collect:async()=>({verified:true,reason:"product-gallery",images}),
   download:async()=>({data:jpeg(1)}),
   logger:quiet
 });
 assert.equal(r.status,"insufficient-real-photos");
 assert.equal(r.distinctPhotos,1);
 assert.equal(r.rejected["duplicate-image-bytes"],4);
});
test("invalid IDs are rejected before gallery access",async()=>{
 await assert.rejects(probeCoupangProductMedia({productId:"bad"},{
   collect:async()=>{throw Error("should not call");},
   logger:quiet
 }),/numeric/);
});
test("unverified gallery images are never downloaded",async()=>{
 const r=await probeCoupangProductMedia({productId:"7491072451"},{
   collect:async()=>({verified:false,reason:"product-page-identity-mismatch",images}),
   download:async()=>{throw Error("should not call");},logger:quiet
 });
 assert.equal(r.distinctPhotos,0);
 assert.equal(r.candidateUrls,0);
});
