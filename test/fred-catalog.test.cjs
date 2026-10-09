const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('fred-spaces-radio.js','utf8'),catalog=JSON.parse(fs.readFileSync('media-star-index.json','utf8'));
test('catalog contains unique individual Fred Space links and preserves legacy IDs',()=>{
 assert.equal(catalog.episodes.length,342);assert.equal(new Set(catalog.episodes.map(e=>e.spaceId)).size,342);
 for(const e of catalog.episodes){assert.equal(e.hostId,'dotkrueger');assert.match(e.source,/^https:\/\/(?:x|twitter)\.com\/i\/spaces\/[A-Za-z0-9]+$/);assert.ok(e.title&&e.date&&e.duration);}
 for(const id of ['fred-0700','fred-0147','fred-0298','fred-0555','fred-0888'])assert.ok(catalog.episodes.some(e=>e.id===id));
});
test('next selection exhausts catalog before repeating, and admits newly added episodes',()=>{
 const memory=new Map(),episodes=structuredClone(catalog.episodes),context={episodes,FIRST:'fred-0700',active:episodes.find(e=>e.id==='fred-0700'),seenKey:'seen',currentKey:'current',stars:new Set(),interestWeights:new Map(),terms:()=>new Set(),crypto:require('node:crypto').webcrypto,load:(k,f)=>memory.get(k)||f,save:(k,v)=>memory.set(k,v),URL};
 const replay=source.slice(source.indexOf('  function isReplayLink'),source.indexOf('  async function token'));
 const remember=source.slice(source.indexOf('  function rememberEpisode'),source.indexOf('  async function more'));
 vm.createContext(context);vm.runInContext(replay+'\n'+remember,context);
 const selected=new Set([context.active.id]);
 for(let i=1;i<342;i++){const next=context.pickNext();assert.ok(!selected.has(next.id),next.id);selected.add(next.id);context.rememberEpisode(next);}
 assert.equal(selected.size,342);const last=context.active.id;assert.notEqual(context.pickNext().id,last);
 memory.set('seen',episodes.map(e=>e.id));episodes.push({...episodes[0],id:'fred-new',source:'https://x.com/i/spaces/NewEpisode'});assert.equal(context.pickNext().id,'fred-new');
});
