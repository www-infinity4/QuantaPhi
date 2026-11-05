import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('radio directory presents all fifty states without inventing local stations',()=>{
 const js=read('iowa-live-radio-cards.js');
 for(const code of ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']) {
  assert.match(js,new RegExp('\\b'+code+':'),code+' must be available in the state picker');
 }
 assert.match(js,/ilr-state-select/);
 assert.match(js,/No sourced stations are listed yet/);
 assert.match(js,/stateFilter\.addEventListener\('change'/);
 assert.match(js,/\.ilr-card\[hidden\]/);
});

test('existing source-backed stations are cataloged under real states and world streams',()=>{
 const js=read('iowa-live-radio-cards.js');
 for(const [id,state] of [['who','IA'],['kxno','IA'],['ipr-news','IA'],['the-bus','IA'],['ipr-studio-one','IA'],['kiss','IA'],['ipr-classical','IA'],['kexp','WA'],['jazz24','WA'],['knkx','WA'],['wfmu','NJ'],['radiomv-english','WORLD'],['radiomv-espanol','WORLD'],['radiomv-deutsch','WORLD'],['radiomv-slavic','WORLD']]){
  assert.match(js,new RegExp("id: '"+id+"', state: '"+state+"'"),id+' mapping is wrong');
 }
 assert.match(js,/card\.dataset\.state=station\.state/);
 assert.match(js,/keep playing in background|keeps playing/i);
});

test('traffic snapshot stays a marked verified record rather than fake live metric',()=>{
 const d=JSON.parse(read('data/site-traffic-lifetime.json'));
 assert.equal(d.site,'quantaphi.org');
 assert.equal(d.scope,'recorded_since');
 assert.equal(d.historicComplete,false);
 assert.equal(d.refreshConfigured,false);
 assert.equal(d.through,'2026-11-03');
 assert.equal(d.requests,1416815);
 assert.equal(d.pageViews,521108);
 assert.equal(d.recordedDays,31);
 assert.ok(Date.parse(d.fetchedAt)>=Date.parse('2026-11-03T00:00:00Z'));
 assert.ok(d.last7Days.requests<=d.requests);
 assert.ok(d.last7Days.pageViews<=d.pageViews);
});
