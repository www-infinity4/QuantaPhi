import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('all first party Bubbles entrypoints load one fresh Octaves chat stylesheet',()=>{
 for(const p of ['index.html','bubbles.html','bubbles/index.html','bubbles-chrome.html']){
  const html=fs.readFileSync(p,'utf8');
  assert.match(html,/bubbles-octaves-chat\.css\?v=20261020-octaves-chat3/);
  assert.match(html,/bubbles-ai\.js\?v=20261020-provider1/);
 }
});
test('Android chat scroll and composer remain distinct, readable surfaces',()=>{
 const css=fs.readFileSync('bubbles-octaves-chat.css','utf8');
 const app=fs.readFileSync('bubbles-ai.js','utf8');
 assert.match(css,/touch-action:pan-y!important/);
 assert.match(css,/overflow-y: auto!important/);
 assert.match(css,/max-height:min\(43dvh,280px\)/);
 assert.match(css,/background:#f2edfa!important/);
 assert.match(css,/--bco-violet: #5f2c91/);
 assert.ok(app.includes('chatScroll.prepend(browserHome)'), 'real browser inside scroll owner');
 assert.ok(app.includes('panel.insertBefore(quick,chatScroll)'), 'approval outside transcript');
 assert.ok(app.includes('if(!nativeOverlay && window.innerWidth>600)input.focus()'), 'no automatic Android keyboard');
 assert.ok(!app.includes('panel.style.height=(viewport?viewport.height:window.innerHeight)'), 'one viewport sizing handler');
 assert.match(app,/quickButton\.dataset\.connected='true'/);
 assert.match(css,/Preserve Bubbles' original blue animated orb/);
});
