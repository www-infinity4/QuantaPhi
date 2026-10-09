const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'workers/infinity-rogers/worker.js'), 'utf8');
const worker = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const endpoint = 'https://infinity-rogers.marvaseater.workers.dev';

test('gateway does not contain artificial daily story or image ceilings', () => {
 assert.doesNotMatch(source, /AI_DAILY_LIMIT|AI_RESERVE|IMAGE_DAILY_CAP|daily_quota_exceeded|image_daily_cap/);
 assert.match(source, /return\{day,used,remaining:null,limit:null,reserve:0/);
 assert.match(source, /freshStory=body\?\.context\?\.task==="infinite-book-deep-story"/);
});

test('fresh GPT stories call the model on every request even without a metering database', async () => {
 const {default:gateway} = await worker;
 let generations = 0;
 const env = {AI:{run:async() => ({response:'Generated story ' + (++generations)})}};
 for (let i=0;i<3;i++) {
  const request = new Request(endpoint + '/v1/chat', {
   method:'POST',
   headers:{origin:'https://quantaphi.org','content-type':'application/json','X-Infinity-User':'test-story-unlimited'},
   body:JSON.stringify({input:'Write original researched story',context:{application:'QuantaPhi',task:'infinite-book-deep-story',generationId:'same-text'}})
  });
  const response=await gateway.fetch(request,env);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.output,'Generated story '+(i+1));
  assert.equal(body.cached,false);
  assert.equal(body.meter.limit,null);
 }
 assert.equal(generations,3);
});

test('image rendering continues beyond the old 20-per-day threshold', async () => {
 const {default:gateway} = await worker;
 let generations=0;
 const db={prepare:()=>({bind:()=>({first:async()=>({prompt_tokens:400000,completion_tokens:400000,requests:999}),run:async()=>({})})})};
 const env={AI:{run:async() => {generations++;return {image:'ZmFrZS1pbWFnZQ=='};}},METER_DB:db};
 for(let i=0;i<21;i++){
  const form=new FormData();
  form.set('prompt','Documented history editorial illustration '+i);
  form.set('mode','Image');
  const response=await gateway.fetch(new Request(endpoint+'/v1/image',{
   method:'POST',headers:{origin:'https://quantaphi.org','X-Infinity-User':'test-image-unlimited'},body:form
  }),env);
  assert.equal(response.status,200,'image attempt '+(i+1));
  const body=await response.json();
  assert.equal(body.ok,true);
  assert.equal(body.remaining,null);
 }
 assert.equal(generations,21);
});
