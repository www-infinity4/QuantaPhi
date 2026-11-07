import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLedger,validateAudit,formatMetric,compareMetrics} from '../traffic-intelligence-core.mjs';
import {readFileSync} from 'node:fs';

const source={id:'cf-edge',provider:'Cloudflare',dataset:'Analytics SQL events.httpRequests',query:'zone + host + UTC range',fetchedAt:'2026-11-06T23:00:00Z',precision:'sampled_estimate',status:'connected'};
const metric=(value,sourceId='cf-edge',basis='sampled_estimate',unit='requests')=>({value,sourceId,basis,unit,asOf:'2026-11-06T23:00:00Z'});
const audit=()=>({schemaVersion:1,site:'quantaphi.org',range:'7d',
 period:{start:'2026-10-30T00:00:00Z',endExclusive:'2026-11-06T00:00:00Z'},
 previousPeriod:{start:'2026-10-23T00:00:00Z',endExclusive:'2026-10-30T00:00:00Z'},
 sources:[source],
 signals:{verifiedBots:metric(0),suspicious:null,unknown:null,humanLikely:null,realtimeActiveUsers:null},
 pages:[{path:'/',current:{edgeRequests:metric(420)},previous:{edgeRequests:metric(400)}}]});

test('source-backed zero is displayed as zero, missing values are not turned into zero',()=>{
 assert.equal(formatMetric(metric(0)),'≈0');
 assert.equal(formatMetric(null),'—');
 assert.equal(formatMetric({value:7,basis:'observed'}),'7');
});
test('Cloudflare existing ledger is bots-inclusive, not counted as humans',()=>{
 const ledger={schemaVersion:2,site:'quantaphi.org',source:'Cloudflare GraphQL httpRequests1dGroups',scope:'recorded_since',
  historicComplete:false,includesBots:true,requests:100,pageViews:20,since:'2026-10-04',through:'2026-11-05',
  fetchedAt:'2026-11-05T22:53:21.033Z',last7Days:{requests:40,pageViews:9,daysRecorded:7},refreshConfigured:false};
 assert.equal(parseLedger(ledger).includesBots,true);
 assert.equal(parseLedger(ledger).refreshConfigured,false);
 assert.throws(()=>parseLedger({...ledger,requests:-1}),/invalid/i);
 assert.throws(()=>parseLedger({...ledger,includesBots:false}),/invalid/i);
});
test('provider evidence is required for every populated traffic metric',()=>{
 assert.equal(validateAudit(audit()).pages.length,1);
 const bad=audit();bad.signals.humanLikely=metric(30,'imaginary-source');
 assert.throws(()=>validateAudit(bad),/source/i);
 const badCount=audit();badCount.pages[0].current.edgeRequests.value=-1;
 assert.throws(()=>validateAudit(badCount),/metric/i);
});
test('audit blocks other hosts and private URLs in page rows',()=>{
 for(const path of ['https://another.example/','//another.example/path','/foo?email=secret','not-absolute']){
  const bad=audit();bad.pages[0].path=path;assert.throws(()=>validateAudit(bad),/path/i);
 }
});
test('non-comparable periods are not subtracted as if they were identical measures',()=>{
 assert.equal(compareMetrics(metric(9),null),null);
 assert.equal(compareMetrics(metric(9),metric(4,'other')),null);
 assert.equal(compareMetrics(metric(9),metric(4,'cf-edge','observed')),null);
 assert.deepEqual(compareMetrics(metric(9),metric(4)),{delta:5,percent:125});
 assert.deepEqual(compareMetrics(metric(9),metric(0)),{delta:9,percent:null});
});
test('page contains all required panels, no user-facing fake traffic totals',()=>{
 const html=readFileSync(new URL('../traffic-intelligence.html',import.meta.url),'utf8');
 for(const panel of ['Realtime','Verified bots','Suspicious','Unknown','Page-by-page','Reconciliation','Crawler checks','Source register','Wiring issues']){
  assert.ok(html.includes(panel),panel);
 }
 assert.ok(html.includes('/api/site-traffic'));
 assert.ok(html.includes('/api/traffic-intelligence'));
 assert.ok(html.includes('textContent'));
 assert.ok(!/const\s+(?:visitors|humans)\s*=\s*\d+/.test(html));
});
