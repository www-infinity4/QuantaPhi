import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  US_STATES,
  normalizeStation,
  stationSearchParams,
  stateRadioWorker
} from '../workers/state-radio-directory/worker.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('radio directory includes all fifty states and DC without fake station totals',()=>{
 assert.equal(US_STATES.length,51);
 assert.equal(new Set(US_STATES.map(x=>x[0])).size,51);
 for(const code of ['IA','NE','CA','NY','TX','HI','AK','DC'])assert.ok(US_STATES.some(x=>x[0]===code));
 assert.equal(US_STATES.find(x=>x[0]==='IA')[1],'Iowa');
});

test('state-only search restricts country, matches exact state, and paginates a bounded external database',()=>{
 const query=stationSearchParams('IA','jazz',2).toString();
 const p=new URLSearchParams(query);
 assert.equal(p.get('countrycode'),'US');
 assert.equal(p.get('state'),'Iowa');
 assert.equal(p.get('stateExact'),'true');
 assert.equal(p.get('hidebroken'),'true');
 assert.equal(p.get('name'),'jazz');
 assert.equal(p.get('offset'),'48');
 assert.equal(p.get('limit'),'25');
 assert.throws(()=>stationSearchParams('XX','',0),/state/i);
 assert.throws(()=>stationSearchParams('IA','',999999),/page/i);
});

const raw=(overrides={})=>({
 stationuuid:'e2e2d72d-1513-40b5-b808-78988eae3bf0',
 name:'  News Radio & Jazz  ',
 countrycode:'US',state:'Iowa',iso_3166_2:'US-IA',
 homepage:'https://radio.example.org/listen',
 favicon:'https://radio.example.org/logo.png',
 url_resolved:'https://stream.example.org/live.mp3',
 lastcheckok:1,lastchecktime_iso8601:'2026-11-03T00:00:00Z',
 codec:'MP3',bitrate:128,hls:0,tags:'jazz,talk',...overrides
});

test('normalized station rows include honest health, source, and safe on-site audio only for supported HTTPS streams',()=>{
 const station=normalizeStation(raw(),'IA');
 assert.equal(station.name,'News Radio & Jazz');
 assert.equal(station.state,'IA');
 assert.equal(station.canPlayInline,true);
 assert.equal(station.stream,'https://stream.example.org/live.mp3');
 assert.equal(station.checkedAt,'2026-11-03T00:00:00Z');
 assert.equal(station.website,'https://radio.example.org/listen');
 assert.equal(normalizeStation(raw({state:'Nebraska',iso_3166_2:'US-NE'}),'IA'),null);
 assert.equal(normalizeStation(raw({countrycode:'CA'}),'IA'),null);
 assert.equal(normalizeStation(raw({lastcheckok:0}),'IA'),null);
 assert.equal(normalizeStation(raw({stationuuid:'invalid'}),'IA'),null);
 const http=normalizeStation(raw({url_resolved:'http://stream.example.org/audio',homepage:'javascript:alert(1)',favicon:'data:image/svg+xml,hi'}),'IA');
 assert.equal(http.canPlayInline,false);
 assert.equal(http.stream,null);
 assert.equal(http.website,null);
 assert.equal(http.favicon,null);
 const hls=normalizeStation(raw({hls:1}),'IA');
 assert.equal(hls.canPlayInline,false);
});

test('Worker state directory is read-only to callers and does not return unsourced live station claims',async()=>{
 const cache=new Map();let fetched=0;
 const db={
  prepare(sql){
   return {bind(...params){return {
    async first(){return cache.get(params.join('|'))||null;},
    async run(){cache.set(params.slice(0,3).join('|'),{payload:params[3],fetched_at:params[4]});return {success:true};}
   }}};
  },
  async batch(){return [];}
 };
 const fetcher=async url=>{
  fetched+=1;
  assert.match(String(url),/countrycode=US/);
  assert.match(String(url),/stateExact=true/);
  return {ok:true,async json(){return [raw()]}};
 };
 const env={RADIO_DB:db};
 const original=new Request('https://radio.example.workers.dev/v1/stations?state=IA&page=0');
 const first=await stateRadioWorker.fetch(original,env,{fetcher,now:()=>Date.parse('2026-11-05T15:00:00Z')});
 assert.equal(first.status,200);
 const body=await first.json();
 assert.equal(body.state,'IA');
 assert.equal(body.stations.length,1);
 assert.equal(body.stations[0].canPlayInline,true);
 assert.equal(body.hasMore,false);
 assert.equal(body.totalKnown,null);
 assert.equal(body.source,'Radio Browser community database');
 const repeated=await stateRadioWorker.fetch(original,env,{fetcher,now:()=>Date.parse('2026-11-05T15:00:30Z')});
 assert.equal(repeated.status,200);
 assert.equal(fetched,1);
 const rejected=await stateRadioWorker.fetch(new Request('https://radio.example.workers.dev/v1/stations?state=XX'),env,{fetcher});
 assert.equal(rejected.status,400);
 const forbidden=await stateRadioWorker.fetch(new Request('https://radio.example.workers.dev/v1/stations',{method:'POST'}),env,{fetcher});
 assert.equal(forbidden.status,405);
});

test('homepage includes a nationwide station dropdown adjacent to the existing radio card',()=>{
 const html=read('index.html'),js=read('state-radio-directory.mjs');
 assert.match(html,/id="stateRadioDirectory"/);
 assert.match(html,/src="\/state-radio-directory.mjs\?/);
 assert.match(js,/US_STATES/);
 assert.match(js,/select/);
 assert.match(js,/radio-directory/);
 assert.match(js,/audio/);
 assert.match(js,/quantaphi:station-selected/);
 assert.doesNotMatch(js,/autoplay\s*=\s*true/i);
});
