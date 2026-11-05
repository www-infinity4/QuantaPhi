import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHANNELS,OFFERS,IOWA_CITIES,routeFamilyRequest,rankDiscovery,forecastSevenDays,filteredTrends,normalizeName,sourceCardForIntent} from '../templates/family-lounge/logic.mjs';

test('family voice remote maps explicit user commands to reviewed destinations',()=>{
  assert.deepEqual(routeFamilyRequest('Bubbles, turn on CNN'),{type:'channel',id:'cnn'});
  assert.deepEqual(routeFamilyRequest('Hey Bubbles, play Fox news'),{type:'channel',id:'fox'});
  assert.deepEqual(routeFamilyRequest('Watch Netflix'),{type:'channel',id:'netflix'});
  assert.deepEqual(routeFamilyRequest('Bubbles, play Blue Steel'),{type:'channel',id:'westerns'});
  assert.deepEqual(routeFamilyRequest('Please play Infinity radio'),{type:'radio'});
  assert.deepEqual(routeFamilyRequest("What's the deals at Hardee's?"),{type:'deals',term:'hardees'});
  assert.deepEqual(routeFamilyRequest("Show McDonalds deals"),{type:'deals',term:'mcdonalds'});
  assert.deepEqual(routeFamilyRequest('Iowa weather next week'),{type:'weather'});
  assert.deepEqual(routeFamilyRequest('Search for western film actors'),{type:'search',query:'western film actors'});
  assert.equal(routeFamilyRequest(''),null);
});

test('no commercial TV subscription is silently treated as a playable iframe',()=>{
  assert.ok(CHANNELS.some(x=>x.id==='cnn'&&x.mode==='provider'));
  assert.ok(CHANNELS.some(x=>x.id==='netflix'&&x.mode==='provider'&&x.login));
  assert.ok(CHANNELS.some(x=>x.id==='fox'&&x.mode==='provider'));
  assert.ok(CHANNELS.some(x=>x.id==='westerns'&&x.mode==='embedded'));
  for(const x of CHANNELS)assert.equal(new URL(x.url).protocol,'https:');
});

test('restaurant widget suggests real official sources, never made-up prices or sponsored status',()=>{
  const rows=sourceCardForIntent('hardees');
  assert.equal(rows.length,3);
  assert.deepEqual(rows.map(x=>x.id),['hardees','mcdonalds','wendys']);
  for(const row of rows){
    assert.equal(row.advertiserPaid,false);
    assert.ok(row.url.startsWith('https://'));
    assert.doesNotMatch(row.description,/\$\d+|today only|50% off/i);
  }
  assert.equal(sourceCardForIntent('not-a-brand').length,0);
});

test('relevance ranking uses only declared consent-based interests and explicit chosen topic',()=>{
  const rows=rankDiscovery(OFFERS,{interests:['food'],topic:'hardees'});
  assert.equal(rows[0].id,'hardees');
  assert.ok(rows.findIndex(x=>x.id==='mcdonalds')<rows.findIndex(x=>x.id==='netflix'));
  assert.deepEqual(rankDiscovery(OFFERS,{}).map(x=>x.id),OFFERS.map(x=>x.id));
});

test('NWS 12-hour periods become seven real date-labelled days without made-up nighttime highs',()=>{
  const periods=[
    {startTime:'2026-11-04T06:00:00-06:00',isDaytime:true,temperature:46,shortForecast:'Partly Sunny',probabilityOfPrecipitation:{value:20}},
    {startTime:'2026-11-04T18:00:00-06:00',isDaytime:false,temperature:28,shortForecast:'Cloudy',probabilityOfPrecipitation:{value:30}},
    {startTime:'2026-11-05T06:00:00-06:00',isDaytime:true,temperature:53,shortForecast:'Sunny',probabilityOfPrecipitation:{value:0}},
    {startTime:'2026-11-05T18:00:00-06:00',isDaytime:false,temperature:31,shortForecast:'Clear',probabilityOfPrecipitation:{value:0}}
  ];
  const days=forecastSevenDays(periods,'2026-11-04T12:00:00-06:00');
  assert.equal(days.length,2);
  assert.equal(days[0].high,46);
  assert.equal(days[0].low,28);
  assert.equal(days[0].precip,30);
  assert.equal(days[1].high,53);
  assert.equal(days[1].low,31);
  assert.deepEqual(forecastSevenDays([],new Date()),[]);
  assert.equal(IOWA_CITIES.ottumwa.name,'Ottumwa');
});

test('trend cards are rejected when stale, unverified or unrelated to followed subjects',()=>{
  const sample={schema_version:1,source_url:'https://trends.google.com/trending/rss?geo=US',
    generated_at:'2026-11-04T20:00:00Z',
    topics:[{query:'The Chicks tour',traffic:'20K+'},{query:'Random viral politics',traffic:'100K+'}]};
  const clock=new Date('2026-11-04T21:00:00Z');
  assert.deepEqual(filteredTrends(sample,['music'],clock).map(x=>x.query),['The Chicks tour']);
  assert.deepEqual(filteredTrends(sample,[],clock),[]);
  assert.deepEqual(filteredTrends({...sample,source_url:'https://fake.example/rss'},['music'],clock),[]);
  assert.deepEqual(filteredTrends(sample,['music'],new Date('2026-11-10T21:00:00Z')),[]);
});

test('name is a display nickname, not evidence of a verified wallet identity',()=>{
  assert.equal(normalizeName('   Rosie   '),'Rosie');
  assert.equal(normalizeName('<script>alert(1)</script>'),'Bubbles');
  assert.equal(normalizeName('X'.repeat(100)).length,32);
});

test('family lounge has source-backed no-autoplay controls, same player and guest Bubbles',()=>{
  const html=readFileSync(new URL('../gary/index.html',import.meta.url),'utf8');
  const app=readFileSync(new URL('../gary/lounge.mjs',import.meta.url),'utf8');
  assert.match(html,/id="family-lounge"/);
  assert.match(html,/src="\/gary\/lounge\.mjs"/);
  assert.match(app,/bubbles-embed\.js/);
  assert.match(app,/bubbles:work-draft/);
  assert.match(app,/api\.weather\.gov\/points/);
  assert.match(app,/google-trends-latest\.json/);
  assert.match(app,/infinity-radio\/oracle-track-feed\.json/);
  assert.match(app,/new Audio\(\)/);
  assert.doesNotMatch(app,/autoplay\s*=\s*true|autoplay=1/);
  assert.doesNotMatch(app,/getUserMedia\s*\(|SpeechRecognition\s*\(/); // voice remote will be gated separately
});
