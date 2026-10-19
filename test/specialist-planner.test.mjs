import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),tools=require('../bubbles-brain-actions.js');
const code=await fs.readFile(new URL('../src/specialist-planner.js',import.meta.url),'utf8');
const {planAndQueue}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('planner sends the full dependency plan once to authenticated Brain instead of local stub storage',async()=>{
 const calls=[];const options={owner:{ready:Promise.resolve({Authorization:'Bearer fixture-owner'})},tools,send:async(url,init)=>{calls.push({url,...init});return Response.json({ok:true,ticket:{id:'IW-test',status:'ready'},execution:{status:'queued_for_runner'}})}};
 const result=await planAndQueue({request:'Build a website-to-APK tool',repository:'www-infinity4/QuantaPhi'},options);
 assert.equal(calls.length,1);const body=JSON.parse(calls[0].body);assert.equal(body.start_immediately,true);assert.equal(body.context.plan.kind,'website-to-apk');assert.equal(body.context.color_jobs[0].status,'queued');assert.deepEqual(body.context.color_jobs[1].dependencies,['TASK-1']);assert.ok(body.context.plan.stages.every(s=>s.status==='planned'));assert.equal(result.ticket.id,'IW-test');assert.match(result.message,/runner has been requested/);assert.ok(!code.includes('indexedDB'));
 await planAndQueue({request:'Build a website-to-APK tool',repository:'www-infinity4/QuantaPhi'},options);
 assert.equal(JSON.parse(calls[1].body).context.submission_id,body.context.submission_id);
});
test('unverified owner and failed submission never become local queued success',async()=>{
 let calls=0;
 await assert.rejects(planAndQueue('Build the website',{owner:{ready:Promise.resolve(null)},tools,send:async()=>{calls++}}),/Connect your owner session/);assert.equal(calls,0);
 await assert.rejects(planAndQueue('Build the website',{owner:{ready:Promise.resolve({Authorization:'Bearer fixture'})},tools,send:async()=>Response.json({ok:false,error:'runner unavailable'},{status:503})}),/runner unavailable/);
});

test('request acknowledgements distinguish launch request, unavailable runner and existing work',()=>{
 const accepted=tools.executionMessage({status:'queued_for_runner'});
 assert.match(accepted,/runner has been requested/);assert.doesNotMatch(accepted,/finished|completed|deployed|is building/);
 const unavailable=tools.executionMessage({status:'scheduled_fallback'});
 assert.match(unavailable,/has not confirmed a launch/);assert.match(unavailable,/retry automatically/);
 const duplicate=tools.executionMessage({},true,'working');assert.match(duplicate,/without creating duplicate work/);
});
