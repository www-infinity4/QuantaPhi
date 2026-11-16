import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{validState} from '../workers/radio-stations/worker.mjs';

test('state selector only accepts real state codes, WORLD or all',()=>{
 assert.equal(validState('IA'),true);
 assert.equal(validState('WY'),true);
 assert.equal(validState('WORLD'),true);
 assert.equal(validState('all'),true);
 for(const invalid of ['ZZ','undefined','AL;DROP TABLE radio_stations','',null,'ia']) assert.equal(validState(invalid),false);
});

test('state-filtered station lookup uses bound D1 parameter and no synthetic rows',async()=>{
 const queries=[];
 const db={prepare(sql){const state={sql,args:[]};queries.push(state);return{
  bind(...args){state.args=args;return this},
  async all(){return {results:[{id:'ipr-news',name:'Iowa Public Radio News',state_code:'IA',frequency:'640 AM',genre:'Public News',city:'Statewide',player:'mp3',source_url:'https://www.iowapublicradio.org/listening-digitally',stream_url:'https://news-stream.iowapublicradio.org/News.mp3',low_stream_url:null,schedule_url:null,playback_checked_at:null}]}}
 }}};
 const response=await worker.fetch(new Request('https://quantaphi.org/api/radio-stations?state=IA'),{RADIO_STATIONS_D1:db});
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.state,'IA');
 assert.equal(data.stations.length,1);
 assert.equal(data.stations[0].player,'mp3');
 assert.equal(data.stations[0].playbackVerified,false);
 assert.deepEqual(queries[0].args,['IA']);
 assert.match(queries[0].sql,/state_code\s*=\s*\?/);
 assert.doesNotMatch(JSON.stringify(data),/cloudflare.*token/i);
});

test('read-only API rejects invalid states and mutation requests, protects missing D1',async()=>{
 assert.equal((await worker.fetch(new Request('https://quantaphi.org/api/radio-stations?state=ZZ'),{})).status,400);
 assert.equal((await worker.fetch(new Request('https://quantaphi.org/api/radio-stations',{method:'POST'}),{})).status,405);
 assert.equal((await worker.fetch(new Request('https://quantaphi.org/api/other'),{})).status,404);
 assert.equal((await worker.fetch(new Request('https://quantaphi.org/api/radio-stations'),{})).status,503);
});
