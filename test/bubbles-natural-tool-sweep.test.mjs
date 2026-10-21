import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseTool,readGithubFile} from '../workers/bubbles-tools/worker.mjs';
import {lookupKind,searchTerms,weatherLocations,compareWeather,weatherPlace} from '../workers/bubbles-tools/search.mjs';
import {browserSpeechIntent} from '../bubbles-cloud-browser.mjs';

const weatherFixture=async url=>{
 const u=new URL(url);
 if(u.hostname==='geocoding-api.open-meteo.com'){
  const q=u.searchParams.get('name')||'';
  const location=/albia/i.test(q)?{name:'Albia',admin1:'Iowa',latitude:1,longitude:1}:
   /omaha/i.test(q)?{name:'Omaha',admin1:'Nebraska',latitude:2,longitude:2}:
   /denver/i.test(q)?{name:'Denver',admin1:'Colorado',latitude:3,longitude:3}:
   /lovilia/i.test(q)?{name:'Lovilia',admin1:'Iowa',latitude:4,longitude:4}:
   /ottumwa/i.test(q)?{name:'Ottumwa',admin1:'Iowa',latitude:5,longitude:5}:null;
  return new Response(JSON.stringify({results:location?[{...location,country:'United States',country_code:'US'}]:[]}),{status:200});
 }
 if(u.hostname==='api.open-meteo.com'){
  const lat=Number(u.searchParams.get('latitude'));
  return new Response(JSON.stringify({
   timezone:'America/Chicago',timezone_abbreviation:'CDT',
   current:{temperature_2m:60+lat,apparent_temperature:57+lat,weather_code:2,wind_speed_10m:8,time:'2026-10-20T16:00'},
   daily:{time:['2026-10-20','2026-10-21'],temperature_2m_max:[70+lat,71+lat],
    temperature_2m_min:[40+lat,41+lat],precipitation_probability_max:[10,20]}
  }),{status:200});
 }
 throw Error('Unapproved fixture request '+u.hostname);
};

test('ordinary language identifies web search, real weather, README, and build work correctly',()=>{
 const cases=[
  ['Could you do a search for responsive mobile typography','web.search'],
  ['Bubbles, search Google for accessible buttons','web.search'],
  ['What is the weather in Albia, Iowa and Omaha, Nebraska?','weather.current'],
  ['Bubbles, read the README from www-infinity4/QuantaPhi','github.read_file'],
  ['Open the GitHub repository www-infinity4/QuantaPhi','github.read_repository'],
  ['Build a weather dashboard app','oracle.chat']
 ];
 for(const [utterance,expected] of cases)assert.equal(chooseTool(utterance),expected,utterance);
 assert.equal(searchTerms('Could you do a search for responsive mobile typography'),'responsive mobile typography');
 assert.equal(searchTerms('Bubbles, search Google for accessible buttons'),'accessible buttons');
});
test('explicit cities stay independent and no missing location is invented',()=>{
 assert.deepEqual(weatherLocations('What is the weather in Albia, Iowa and Omaha, Nebraska?'),['Albia, Iowa','Omaha, Nebraska']);
 assert.deepEqual(weatherLocations('Weather for Albia, Iowa; Omaha, Nebraska; Denver, Colorado'),['Albia, Iowa','Omaha, Nebraska','Denver, Colorado']);
 assert.deepEqual(weatherLocations('Weather for Albia, Iowa, Omaha, Nebraska, Denver, Colorado'),['Albia, Iowa','Omaha, Nebraska','Denver, Colorado']);
 assert.deepEqual(weatherLocations('Tell me the weather around here'),[]);
 assert.equal(weatherPlace('Weather now',null),'');
 const natural='What is the current weather in Albia, Lovilia, and Ottumwa, Iowa? Include the observation time and source for each. Tell me if you cannot verify a location.';
 assert.deepEqual(weatherLocations(natural),['Albia, Iowa','Lovilia, Iowa','Ottumwa, Iowa']);
 assert.deepEqual(weatherLocations('Weather in Albia, Iowa and Ottumwa, Iowa?'),['Albia, Iowa','Ottumwa, Iowa']);
 assert.deepEqual(weatherLocations('Weather in Albia, IA, Omaha, NE'),['Albia, IA','Omaha, NE']);
 assert.deepEqual(weatherLocations('Weather in Albia and Ottumwa, Iowa'),['Albia, Iowa','Ottumwa, Iowa']);
});
test('multi-city Open-Meteo test returns separate grounded conditions and source, with a bounded count',async()=>{
 const result=await compareWeather('Check weather in Albia, Iowa; Omaha, Nebraska; Denver, Colorado',weatherFixture);
 assert.equal(result.ok,true);
 assert.equal(result.locations.length,3);
 assert.deepEqual(result.locations.map(x=>x.temperatureF),[61,62,63]);
 for(const name of ['Albia','Omaha','Denver'])assert.ok(result.output.includes(name));
 const bounded=await compareWeather('Weather in Albia, Iowa; Omaha, Nebraska; Denver, Colorado; Chicago, Illinois; Kansas City, Missouri',weatherFixture);
 assert.equal(bounded.needsLocation,true);
 assert.match(bounded.output,/four named locations/);
 const natural='What is the current weather in Albia, Lovilia, and Ottumwa, Iowa? Include the observation time and source for each. Tell me if you cannot verify a location.';
 const checked=await compareWeather(natural,weatherFixture);
 assert.equal(checked.ok,true);
 assert.equal(checked.locations.length,3);
 assert.deepEqual(checked.locations.map(x=>x.temperatureF),[61,64,65]);
 for(const place of checked.locations){
  assert.equal(place.provider,'Open-Meteo');
  assert.equal(place.observedAt,'2026-10-20T16:00');
  assert.match(checked.output,new RegExp(place.requested));
 }
 const partial=await compareWeather('Weather in Albia, Lovilia, and Unknownville, Iowa? Include observation time.',weatherFixture);
 assert.equal(partial.ok,false);
 assert.equal(partial.partial,true);
 assert.equal(partial.locations.length,3);
 assert.match(partial.output,/Could not verify Unknownville, Iowa:/);
 assert.doesNotMatch(partial.output,/✓ Unknownville/);
});
test('cloud browser natural phrases map to read-only browser observation with owner gate retained',()=>{
 assert.equal(browserSpeechIntent('Bubbles, show me the cloud browser').action,'show');
 const research=browserSpeechIntent('Search for accessible HTML buttons in the cloud browser');
 assert.equal(research.action,'research');
 assert.match(new URL(research.url).searchParams.get('q'),/accessible HTML buttons/);
 assert.equal(browserSpeechIntent('Open the Bubbles cloud browser to inspect this website').action,'navigate');
 assert.equal(browserSpeechIntent('Read the QuantaPhi README'),null);
});
test('read README returns actual repository text plus proof of public source, not fabricated actions',async()=>{
 const source='# QuantaPhi\n\nA long README with build, design, and accessibility notes.\n';
 const fetcher=async url=>{
  assert.match(url,/^https:\/\/api\.github\.com\/repos\/www-infinity4\/QuantaPhi\/contents\/README\.md$/);
  return Response.json({type:'file',path:'README.md',size:Buffer.byteLength(source),encoding:'base64',
   content:Buffer.from(source,'utf8').toString('base64'),html_url:'https://github.com/www-infinity4/QuantaPhi/blob/main/README.md'});
 };
 const request=new Request('https://bubbles-tools.example/v1/assist',{headers:{Origin:'https://quantaphi.org'}});
 const receipt={id:'test',tool:'github.read_file'};
 const response=await readGithubFile(request,{request:'Read the README for www-infinity4/QuantaPhi'},receipt,fetcher);
 const data=await response.json();
 assert.equal(data.receipt.status,'complete');assert.equal(data.receipt.sourceReadVerified,true);
 assert.equal(data.receipt.repositoryActionsVerified,false);
 assert.equal(data.content,source);
 assert.equal(data.truncated,false);
 assert.equal(data.sourceUrl,'https://github.com/www-infinity4/QuantaPhi/blob/main/README.md');
});
test('README requests without exact repository and traversal paths cannot fetch source',async()=>{
 let calls=0;const fail=async()=>{calls++;throw Error('Unapproved fetch')};
 const request=new Request('https://bubbles-tools.example/v1/assist');
 const receipt={id:'test'};
 const one=await readGithubFile(request,{request:'Read the README'},receipt,fail);
 const two=await readGithubFile(request,{request:'Read repo file',repository:'www-infinity4/QuantaPhi',path:'../secrets.txt'},receipt,fail);
 assert.equal((await one.json()).receipt.status,'needs_input');
 assert.equal((await two.json()).receipt.status,'needs_input');
 assert.equal(calls,0);
});
