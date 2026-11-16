import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {subtitleLayout} from '../modules/subtitle.js';
import {getDirectorEffect} from '../modules/video/effects.js';

test('hook body ranking CTA use distinct readable editorial subtitle layouts',()=>{
 const styles=[
   subtitleLayout('Hook',0),
   subtitleLayout('Shorts',1),
   subtitleLayout('Shorts',2),
   subtitleLayout('Ranking',3),
   subtitleLayout('CTA',4)
 ];
 assert.ok(new Set(styles.map(x=>x.y)).size>=3);
 assert.ok(new Set(styles.map(x=>x.font)).size>=3);
 for(const s of styles){assert.ok(s.y>=400&&s.y<=1500);assert.ok(s.size>=70&&s.size<=110);}
});
test('camera director accepts non-static moves and scene fallback cycles them',()=>{
 const left=getDirectorEffect(160,{shot:'closeup',cameraMove:'pan_left',motion:'zoom_in'});
 const right=getDirectorEffect(160,{shot:'wide',cameraMove:'pan_right',motion:'zoom_out'});
 assert.notEqual(left,right);
 const code=fs.readFileSync(new URL('../modules/video.js',import.meta.url),'utf8');
 assert.match(code,/SCENE_MOVES=.*pan_right/);
 assert.match(code,/fallbackSceneDirection\(item,i\)/);
});
