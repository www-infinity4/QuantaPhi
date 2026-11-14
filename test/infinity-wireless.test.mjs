import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import worker,{validateOrder,publicReceipt} from '../workers/infinity-wireless/worker.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const base={city:'Oskaloosa',state:'IA',goal:'community',backhaul:'unknown',acceptedPlanningOnly:true,requestKey:'a'.repeat(64)};
const request=(route,method='GET',body,headers={})=>new Request('https://quantaphi.org'+route,{method,headers:{Origin:'https://quantaphi.org',...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});

test('valid orders are coarse-area planning only, not service provisioning',()=>{
 const result=validateOrder(base);
 assert.equal(result.error,undefined);
 assert.equal(result.order.city,'Oskaloosa');
 assert.equal(result.order.state,'IA');
 assert.equal(result.order.backhaul,'unknown');
 for(const value of ['home','community','business','pilot']){
  const x=validateOrder({...base,goal:value});assert.equal(x.error,undefined);
 }
 assert.equal(publicReceipt({id:'IW-EXAMPLE',city:'Oskaloosa',state:'IA',goal:'community',backhaul:'unknown',created_at:'2026-11-02T00:00:00.000Z'}).serviceActive,false);
 assert.equal(publicReceipt({id:'IW-EXAMPLE',city:'Oskaloosa',state:'IA',goal:'community',backhaul:'fiber',created_at:'2026-11-02T00:00:00.000Z'}).coverageVerified,false);
});

test('rejects precise addresses, contact info, unrecognized states and fabricated readiness',()=>{
 for(const city of ['123 Main St','Oskaloosa, IA','hello@example.com','Oskaloosa 52577','555-123-4567','<script>',''])assert.ok(validateOrder({...base,city}).error,city);
 for(const state of ['ZZ','Iowa','', 'ia '])assert.ok(validateOrder({...base,state}).error,state);
 assert.ok(validateOrder({...base,acceptedPlanningOnly:false}).error);
 assert.ok(validateOrder({...base,requestKey:'weak'}).error);
 assert.ok(validateOrder({...base,serviceActive:true}).error);
});

test('fails closed without real D1 storage and does not fake a receipt',async()=>{
 const r=await worker.fetch(request('/api/wireless/orders','POST',base),{});
 assert.equal(r.status,503);assert.equal((await r.json()).ok,false);
});

test('rejects cross-site submission and returns no private receipt without its token',async()=>{
 const denied=await worker.fetch(request('/api/wireless/orders','POST',base,{Origin:'https://example.net'}),{WIRELESS_DB:{}});
 assert.equal(denied.status,403);
 const unauthed=await worker.fetch(request('/api/wireless/orders/IW-ABCDEF1234567890ABCD'),{WIRELESS_DB:{}});
 assert.equal(unauthed.status,401);
});

test('HTML is a genuine form with only authorized network intent and truthful state messaging',()=>{
 const html=read('wireless/index.html'),js=read('wireless/order.mjs');
 assert.match(html,/id="build-order"/);
 assert.match(html,/id="order-form"/);
 assert.match(html,/name="city"/);
 assert.match(html,/name="state"/);
 assert.match(html,/Issue Build Order/);
 assert.match(html,/not yet live|not live|not active/i);
 assert.match(js,/\/api\/wireless\/orders/);
 assert.doesNotMatch(html+js,/Infrastructure hijacked|DARPA-grade|Your high-speed air connection is live/i);
});

test('scheduled retention cleanup only deletes expired planning rows and rate buckets',async()=>{
 const calls=[];
 const db={prepare(sql){return {bind(...params){return {run:async()=>{calls.push({sql,params});return {success:true}}}}}}};
 await worker.scheduled({scheduledTime:Date.parse('2026-11-03T07:15:00.000Z')},{WIRELESS_DB:db});
 assert.equal(calls.length,3);
 assert.match(calls[0].sql,/DELETE FROM wireless_events WHERE order_id IN/);
 assert.match(calls[1].sql,/DELETE FROM wireless_orders WHERE created_at </);
 assert.match(calls[2].sql,/DELETE FROM wireless_daily_limits WHERE day </);
 assert.equal(calls[0].params[0],'2026-10-04T07:15:00.000Z');
 assert.equal(calls[1].params[0],'2026-10-04T07:15:00.000Z');
 assert.equal(calls[2].params[0],'2026-11-01');
});
test('private planning retention and scheduled trigger are documented for production',()=>{
 const config=read('workers/infinity-wireless/wrangler.toml'),readme=read('workers/infinity-wireless/README.md');
 assert.match(config,/\[triggers\]/);
 assert.match(config,/crons\s*=\s*\[/);
 assert.match(readme,/30 days/i);
});
