const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('My Storybook is a separate Oracle-styled QuantaPhi site',()=>{
 const html=read('storybook/index.html'),css=read('storybook/storybook.css');
 assert.match(html,/<title>My Storybook · Infinity Oracle<\/title>/);
 assert.match(html,/INFINITY ORACLE · PERSONAL LIBRARY/);
 assert.ok(css.includes('--lime:#d2ef91')&&css.includes('--panel:#191e29'));
 assert.match(html,/class="orbit-art"/);
 assert.ok(!html.includes('news-phi-core.js'));
});
test('opening Storybook never displays five-month-old Quant archive by default',()=>{
 const html=read('storybook/index.html'),script=read('storybook/storybook.js');
 assert.match(html,/<option value="today">Today<\/option>/);
 assert.ok(script.includes("if(scope==='today')"));
 assert.ok(script.includes("get('quantaPhiCollected',[])"));
 assert.ok(!script.includes("get('phiShared:collection:v1'"));
 assert.ok(!script.includes('newsPhi:quantaCloudCards:v1'));
});
test('unwanted media is not shown without direct reader interaction',()=>{
 const js=read('storybook/storybook.js'),html=read('storybook/index.html');
 assert.ok(js.includes("const UNSAFE="));
 assert.ok(js.includes("show.onclick=()"));
 assert.ok(js.includes('Show collected media'));
 assert.ok(!html.includes('<img'));
});
test('full cloud Collect pagination and chapter endpoints are reused',()=>{
 const code=read('storybook/storybook.js');
 assert.ok(code.includes("/v1/quants/collects"));
 assert.ok(code.includes("/v1/quants/storybook"));
 assert.ok(code.includes("'?limit=200&offset='"));
 assert.ok(code.includes("data.hasMore===true"));
});
test('QuantaPhi points to independent Storybook, never News Phi Storybook',()=>{
 const index=read('index.html');
 assert.ok(index.includes('https://quantaphi.org/storybook/'));
 assert.ok(!index.includes('News-Phi/storybook.html'));
});
