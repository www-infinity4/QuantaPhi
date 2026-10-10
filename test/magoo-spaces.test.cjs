const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('Magoo catalog has a separate verified-only empty seed until actual replay URLs are known',()=>{
 const j=JSON.parse(fs.readFileSync('magoo-spaces-index.json','utf8'));
 assert.equal(j.hostId,'hodlmagoo');assert.deepEqual(j.episodes,[]);
});
test('Magoo player code parses, uses separate seen cycle and cannot use Fred paid ledger',()=>{
 const s=fs.readFileSync('magoo-spaces-radio.js','utf8');
 assert.doesNotThrow(()=>new vm.Script(s));
 assert.match(s,/phi:magoo-spaces-seen:v1/);
 assert.match(s,/function pick\(/);
 assert.match(s,/getRandomValues/);
 assert.doesNotMatch(s,/fred-spaces-ledger|\/v1\/spaces\/unlock/);
});
