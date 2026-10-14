import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {summarizeAudience,readAudience,AUDIENCE_ZONE} from '../workers/infinity-brain-clock/audience-report.mjs';
const at=new Date('2026-10-14T03:45:00Z');
const row=(day,more={})=>({day,observed_at:'2026-10-14T03:40:00Z',http_requests:1000,page_views:400,unique_clients:90,browser_loads_not_bot:12,browser_loads_bot:7,browser_visits_not_bot:9,browser_visits_bot:7,...more});
test('keeps request, pageview, daily uniques, and RUM bot data separate',()=>{
 const report=summarizeAudience([row('2026-10-12'),row('2026-10-13')],{at,days:7});
 assert.equal(report.ok,true);assert.equal(report.totals.http_requests,2000);
 assert.equal(report.totals.page_views,800);
 assert.equal(report.totals.browser_loads_not_bot,24);
 assert.equal(report.totals.browser_loads_bot,14);
 assert.equal(report.totals.unique_clients,180);
 assert.notEqual(report.totals.http_requests,report.totals.browser_loads_not_bot);
 assert.match(report.interpretation.join(' '),/not people or clicks/);
 assert.equal(report.dataState,'recorded');
});
test('missing days are not fabricated as zero traffic',()=>{
 const report=summarizeAudience([row('2026-10-10')],{at,days:7});
 assert.equal(report.period.daysAvailable,1);
 assert.equal(report.dataState,'stale');
 assert.match(report.interpretation.join(' '),/Missing days/);
});
test('excludes same-day, future, and out-of-range rows',()=>{
 const report=summarizeAudience([row('2026-10-06'),row('2026-10-10'),row('2026-10-14'),row('2026-10-17')],{at,days:7});
 assert.deepEqual(report.days.map(r=>r.day),['2026-10-10']);
});
test('D1 scoped to the real Zone ID, bounded UTC days and read-only SQL',async()=>{
 const calls=[];
 const db={prepare(sql){calls.push(sql);return {bind(...args){calls.push(args);return {async all(){return {success:true,results:[row('2026-10-13')]}}}}}}};
 const report=await readAudience(db,{at,days:7});
 assert.equal(calls[1][0],AUDIENCE_ZONE);
 assert.equal(calls[1][1],'2026-10-07');
 assert.equal(calls[1][2],'2026-10-14');
 assert.equal(calls[1][3],7);
 assert.match(calls[0],/^SELECT/);
 assert.equal(report.totals.page_views,400);
});
test('owner gateway requires verified private credentials and never returns IP-level raw metrics',()=>{
 const code=fs.readFileSync(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8');
 const start=code.indexOf("if(path==='/owner/audience'");
 assert.ok(start>0);
 const end=code.indexOf("if(['/work/tickets/create'",start);
 const handler=code.slice(start,end);
 assert.match(handler,/ownerAuthorized\(env,token\)/);
 assert.match(handler,/readAudience\(env\.WORK_DB/);
 assert.match(handler,/origin_not_allowed/);
 assert.doesNotMatch(handler,/clientIP|userAgent|authorization:.+Cloudflare/i);
});
test('robot report displays exact metric labels only after owner authentication',()=>{
 const source=fs.readFileSync(new URL('../robot-work-report.js',import.meta.url),'utf8');
 assert.match(source,/QuantaBrainOwner\?\.ready/);
 assert.match(source,/\/owner\/audience\?days=7/);
 assert.match(source,/not unique humans/);
 assert.match(source,/not individual people/);
});
