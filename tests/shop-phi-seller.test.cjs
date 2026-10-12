const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const ui=read('shop-ad-phi.js'),capture=read('shop-phi-seller.js'),policy=read('shop-phi-policy.js');
const homepage=read('index.html');
test('Shop Phi media and policy load before listing card, and all scripts parse',()=>{
 const i=homepage.indexOf('/shop-ad-phi.js'),p=homepage.indexOf('/shop-phi-policy.js'),m=homepage.indexOf('/shop-phi-seller.js');
 assert.ok(p>0&&m>p&&i>m);
 for(const source of [ui,capture,policy])assert.doesNotThrow(()=>new Function(source));
});
test('Shop Phi is photo-first, with camera snap and native mobile fallback',()=>{
 assert.match(capture,/getUserMedia/);
 assert.match(capture,/capture='environment'/);
 assert.match(capture,/Snap photo/);
 assert.match(capture,/Add short video/);
 assert.match(capture,/\.multiple=true/);
 assert.match(capture,/indexedDB\.open/);
 assert.match(capture,/object-fit:contain|MediaRecorder|canvas\.toBlob/);
 assert.match(ui,/sellerStudio\?\.ids\(\)/);
 assert.match(ui,/mediaIds/);
 assert.match(ui,/Publish after verification/);
 assert.ok(!ui.includes('window.currentActiveCardData'));
});
test('Local title-only media draft cannot silently become published catalog inventory',()=>{
 assert.match(ui,/item\.verificationStatus=item\.mediaIds\.length\?'not-reviewed'/);
 assert.match(ui,/if\(draft&&connected&&!item\.mediaIds\?\.length\)/);
 assert.match(capture,/reviewEndpoint/);
 assert.match(capture,/credentials:'same-origin'/);
 assert.match(capture,/comparables/);
 assert.match(capture,/awaiting robot-review service connection/);
 assert.match(ui,/Use an https source link, or attach actual item photos/);
});
test('No browser-side policy pass can claim authenticity',()=>{
 const ctx={};ctx.window=ctx;vm.runInNewContext(policy,ctx);
 const p=ctx.ShopPhiPolicy;
 assert.equal(p.evaluate({title:'Counterfeit Morgan dollar'}).status,'blocked');
 assert.equal(p.evaluate({title:'Shotgun ammunition'}).status,'blocked');
 assert.equal(p.evaluate({title:'1936-D Mercury dime',mediaIds:['a','b']}).status,'needs_review');
 assert.match(p.evaluate({title:'1936-D Mercury dime',mediaIds:['a']}).reason,/both faces/);
 assert.equal(p.evaluate({title:'Old record player',mediaIds:['a']}).status,'needs_review');
});
