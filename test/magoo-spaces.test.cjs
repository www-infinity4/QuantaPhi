const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const seed=JSON.parse(fs.readFileSync('magoo-spaces-index.json','utf8'));
test('Magoo catalog contains two real guest recordings, independently of X Spaces',()=>{
 assert.equal(seed.hostId,'hodlmagoo');
 assert.equal(seed.episodes.length,2);
 assert.equal(new Set(seed.episodes.map(e=>e.id)).size,2);
 assert.deepEqual(new Set(seed.episodes.map(e=>e.platform)),new Set(['Apple Podcasts','YouTube']));
 assert.ok(seed.episodes.every(e=>e.kind.startsWith('guest-')));
 assert.match(seed.episodes.find(e=>e.platform==='Apple Podcasts').source,/^https:\/\/podcasts\.apple\.com\/us\/podcast\//);
 assert.match(seed.episodes.find(e=>e.platform==='YouTube').source,/^https:\/\/www\.youtube\.com\/watch\?v=/);
});
test('Magoo player parses and keeps its independent no-repeat shuffle',()=>{
 const s=fs.readFileSync('magoo-spaces-radio.js','utf8');
 assert.doesNotThrow(()=>new vm.Script(s));
 assert.match(s,/phi:magoo-spaces-seen:v1/);
 assert.match(s,/function pick\(/);
 assert.match(s,/getRandomValues/);
 assert.match(s,/Apple Podcasts/);
 assert.match(s,/YouTube/);
 assert.doesNotMatch(s,/fred-spaces-ledger|\/v1\/spaces\/unlock/);
});
