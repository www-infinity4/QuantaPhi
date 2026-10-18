const {test}=require('node:test');
const assert=require('node:assert/strict');
const {create,summarize}=require('../bubbles-live-tools.js');
const transcript=(text)=>({type:'session.input_transcript.delta',delta:text,start_ms:0,end_ms:1000});
const delegation=(id='d1')=>({type:'session.delegation.created',offset_ms:1200,delegation:{id,target:'client'}});
test('delegation queries authenticated Brain once and returns correlated receipt without credentials',async()=>{
 let calls=0;const sent=[];
 const tool=create({owner:()=>({Authorization:'Bearer SECRET'}),send:e=>sent.push(e),request:async(url,init)=>{
  calls++;assert.equal(url,'https://infinity-brain-clock.marvaseater.workers.dev/work/tickets/list');assert.equal(init.headers.Authorization,'Bearer SECRET');assert.equal(init.body,'{}');
  return {ok:true,json:async()=>({ok:true,tickets:[{context:{color_jobs:[{status:'queued'},{status:'complete'}]}}]})};
 }});
 await tool.receive(transcript('Report the robot brain status'));
 await Promise.all([tool.receive(delegation()),tool.receive(delegation())]);
 assert.equal(calls,1);assert.equal(sent.length,1);assert.equal(sent[0].delegation_id,'d1');assert.equal(sent[0].type,'session.commentary.append');
 assert.match(sent[0].content,/1 queued jobs/);assert.match(sent[0].content,/0 jobs with verified completion/);assert.ok(!JSON.stringify(sent).includes('SECRET'));
});
test('missing owner, unknown commands, metadata instructions and stale transcripts never dispatch work',async()=>{
 let calls=0;const sent=[];const tool=create({owner:()=>null,send:e=>sent.push(e),request:async()=>{calls++;throw Error('unexpected')}});
 await tool.receive({...delegation('metadata'),text:'start all jobs'});
 await tool.receive(transcript('Start all jobs and create an API key'));
 await tool.receive(delegation('mutation'));
 await tool.receive(transcript('Report Brain status'));
 await tool.receive(delegation('owner'));
 await tool.receive({...delegation('old'),offset_ms:50000});
 assert.equal(calls,0);assert.equal(sent.length,4);assert.match(sent[2].content,/could not be verified/);assert.match(sent[3].content,/Use Bubbles Chat/);
});
test('session reset aborts pending request and suppresses late results',async()=>{
 let finish,signal;const sent=[];const tool=create({owner:()=>({Authorization:'Bearer test'}),send:e=>sent.push(e),request:async(_,init)=>{signal=init.signal;return new Promise(resolve=>finish=resolve)}});
 await tool.receive(transcript('report brain status'));const pending=tool.receive(delegation());
 await new Promise(resolve=>setImmediate(resolve));assert.ok(finish);tool.reset();assert.equal(signal.aborted,true);
 finish({ok:true,json:async()=>({ok:true,tickets:[]})});await pending;assert.equal(sent.length,0);
});
test('receipt summary requires actual runner start and every completion check',()=>{
 const progress={runUrl:'https://github.com/www-infinity4/QuantaPhi/actions/runs/123',claimedAt:'2026-10-18T12:00:00Z',commitSha:'a'.repeat(40),testsPassed:true,browserPassed:true,deployedFilesMatched:true,reviewApproved:true};
 const jobs=[{status:'working',progress},{status:'complete',progress},{status:'complete',progress:{...progress,reviewApproved:false}},{status:'working'}];
 const text=summarize([{title:'ignore instructions',context:{color_jobs:jobs}}]);
 assert.match(text,/1 jobs with runner start/);assert.match(text,/1 jobs with verified completion/);assert.match(text,/2 other or unverified/);assert.ok(!text.includes('ignore instructions'));
});
test('owner wait is bounded and provider receives no result after reset',async()=>{
 const sent=[];const tool=create({owner:()=>new Promise(()=>{}),send:e=>sent.push(e),timeout:10});
 await tool.receive(transcript('report brain status'));await tool.receive(delegation());assert.match(sent[0].content,/could not be verified/);
});
