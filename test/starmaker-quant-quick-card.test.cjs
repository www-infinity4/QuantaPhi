const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const fs=require('node:fs');
const moduleUrl=pathToFileURL(path.join(__dirname,'..','starmaker-quick-card.mjs')).href;
const load=()=>import(moduleUrl);
test('Music Quant listening suggestions ignore transferred and non-listening records',async()=>{
 const {listeningSongs}=await load();
 const items=listeningSongs([
  {id:'a',kind:'listening',song:'Perfect',createdAt:'2026-10-25'},
  {id:'b',kind:'playable',song:'Not a song'},
  {id:'c',kind:'listening',song:'Discarded',transferredAt:'2026-10-26'},
  {id:'a',kind:'listening',song:'Perfect',createdAt:'2026-10-25'},
  {id:'d',kind:'listening',song:'  Shape Of You   ',createdAt:'2026-10-26'},
 ]);
 assert.deepEqual(items.map(x=>x.song),['Shape Of You','Perfect']);
});
test('Personalized ranking uses actual listening-song title and valid public StarMaker link',async()=>{
 const {rankForSinging}=await load();
 const songs=[{title:'Hello',artist:'Adele',url:'https://www.starmakerstudios.com/en/song/adele-hello-lyrics/6755116273976328'},
              {title:'Perfect',artist:'Ed Sheeran',url:'https://www.starmakerstudios.com/en/song/ed-sheeran-perfect-lyrics/611752105016719259'}];
 const ranked=rankForSinging(songs,[{song:'Ed Sheeran - Perfect'}]);
 assert.equal(ranked[0].song.title,'Perfect');
 assert.ok(ranked[0].score>ranked[1].score);
 assert.equal(ranked.length,songs.length);
});
test('No history retains curated song order without inventing provider data',async()=>{
 const {rankForSinging}=await load();
 const input=[{title:'Alpha',artist:'One'},{title:'Beta',artist:'Two'}];
 assert.deepEqual(rankForSinging(input,[]).map(x=>x.song.title),['Alpha','Beta']);
 assert.deepEqual(rankForSinging(input,[]).map(x=>x.score),[0,0]);
});
test('Card integrates discovery directly instead of opening a second generic search',()=>{
 const code=fs.readFileSync(path.join(__dirname,'..','quanta-card-experience.mjs'),'utf8');
 assert.match(code,/mountStarMakerQuickCard\(root\)/);
 assert.match(code,/mountCardActions\(root,card,\{showSearch:false\}\);return/);
 const module=fs.readFileSync(path.join(__dirname,'..','starmaker-quick-card.mjs'),'utf8');
 assert.match(module,/check\.addEventListener\('change'/);
 assert.match(module,/check\.checked\?availableListeningRecords\(\):\[\]/);
 assert.doesNotMatch(module,/fetch\(|getUserMedia\(/);
});
