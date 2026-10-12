const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const page=fs.readFileSync('index.html','utf8');
const gate=fs.readFileSync('robot-brain-owner.js','utf8');
const directions=require('../robot-directions.js');

test('owner gate loads before the Brain scripts and never deletes the Brain on a missing key or network failure',()=>{
 const g=page.indexOf('/robot-brain-owner.js?v='),a=page.indexOf('/quanta-agent-iterations.js?v='),r=page.indexOf('/robot-directions.js?v=');
 assert.ok(g>0&&g<a&&g<r,'gate script must run first');
 assert.ok(page.indexOf('id="robotBrainOwner"')<page.indexOf('id="quantaAgentIterations"'));
 assert.match(page,/#quantaAgentIterations:not\(\[data-owner-verified="1"\]\)/,'Brain stays hidden from the public');
 for(const file of ['quanta-agent-iterations.js','robot-directions.js'])
  assert.match(fs.readFileSync(file,'utf8'),/await \(window\.QuantaBrainOwner\?window\.QuantaBrainOwner\.ready:verifyBrainOwner\(\)\)/,file);
 assert.match(gate,/state:'unreachable'/);
 assert.match(gate,/RETRY_MS/);
 assert.match(gate,/r\.status===404/);
 assert.doesNotMatch(gate,/\.remove\(\)/);
});

test('owner gate resolves only for a key the brain clock accepts',async()=>{
 const calls=[];const window={};const good=['Bearer','good-owner-key-0123'].join(' ');
 const ctx={window,AbortSignal,fetch:async(url,opts)=>{calls.push(opts.headers.Authorization);return {ok:opts.headers.Authorization===good,status:opts.headers.Authorization===good?200:404}}};
 require('node:vm').runInNewContext(gate,ctx);
 assert.equal((await window.QuantaBrainOwner.verify('short')).state,'rejected');
 assert.equal((await window.QuantaBrainOwner.verify('wrong-owner-key-0123')).state,'rejected');
 const ok=await window.QuantaBrainOwner.verify('good-owner-key-0123');
 assert.equal(ok.state,'verified');assert.equal(ok.headers.Authorization,good);
 ctx.fetch=async()=>{throw Error('offline')};
 assert.equal((await window.QuantaBrainOwner.verify('good-owner-key-0123')).state,'unreachable');
});

test('every bot gets a toolbox and site-care crews release structured jobs without GPT',()=>{
 const colors=[...new Set(Object.values(directions.ROLES))];
 for(const color of colors)assert.ok(directions.ROLE_TOOLS[color]?.length>=2,color+' team needs tools');
 const ids=directions.SITE_CREWS.map(c=>c.id);
 for(const id of ['health-watch','repair','upgrades','image-proofreading','mobile-a11y','security-wallet'])assert.ok(ids.includes(id),id);
 for(const crew of directions.SITE_CREWS){
  const jobs=directions.normalize({jobs:crew.jobs.map(j=>({...j,repository:'www-infinity4/QuantaPhi'}))});
  assert.ok(jobs.length>0);
  for(const job of jobs){assert.equal(job.repository,'www-infinity4/QuantaPhi');assert.ok(job.tools.length>0);assert.ok(job.acceptance.length>0)}
 }
 const fallback=directions.normalize(directions.fallbackJobs('Fix the broken radio player.\nMake the wallet button bigger on Android.'));
 assert.deepEqual(fallback.map(j=>j.agent),['regression-detective','layout-router']);
 assert.equal(directions.normalize({jobs:[{agent:'greenbeans',title:'x',acceptance:['y'],tools:['Custom tool']}]})[0].tools[0],'Custom tool');
});
