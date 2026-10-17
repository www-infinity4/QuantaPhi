import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker,{chooseTool} from '../workers/bubbles-tools/worker.mjs';
import {lookupKind,searchTerms,weatherPlace,webSearch,currentWeather} from '../workers/bubbles-tools/search.mjs';

const origin='https://quantaphi.org';
const call=async(body,env={})=>worker.fetch(new Request('https://tools/v1/assist',{
 method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)
}),env);
const mockForecast={current:{temperature_2m:63,apparent_temperature:61,weather_code:2,
 wind_speed_10m:9,time:'2026-10-16T18:00'},daily:{temperature_2m_max:[68],temperature_2m_min:[47],precipitation_probability_max:[30]},
 timezone:'America/Chicago',timezone_abbreviation:'CDT'};
const loc={results:[{name:'Albia',admin1:'Iowa',country:'United States',latitude:41.0267,longitude:-92.8053}]};
const weatherFetch=async url=>Response.json(String(url).includes('/geocoding')?loc:mockForecast);
test('actual voice request, not persona history, selects the web and weather tools',()=>{
 assert.equal(chooseTool('What is the weather in Albia, Iowa?'),'weather.current');
 assert.equal(chooseTool('Search Google for ruthenium catalysts'),'web.search');
 assert.equal(chooseTool('Look up the latest information about the eclipse'),'web.search');
 assert.equal(chooseTool('Hello Bubbles'),'oracle.chat');
 assert.equal(searchTerms('Search Google for ruthenium catalysts'),'ruthenium catalysts');
 assert.equal(weatherPlace('Tell me the weather today in Albia, Iowa'),'Albia, Iowa');
 assert.equal(lookupKind('Build a weather app'),null); // Engineering work is not a live weather lookup.
});
test('missing town asks once rather than inventing precise coordinates',async()=>{
 const r=await call({request:'How is the weather?'});
 const body=await r.json();
 assert.equal(body.receipt.status,'needs_input');
 assert.match(body.output,/Which town and state/i);
 assert.equal(body.location,undefined);
});
test('real forecast is sourced, labelled, rounded, and never invented by AI',async()=>{
 const result=await currentWeather('How is the weather today in Albia, Iowa?',null,weatherFetch);
 assert.equal(result.ok,true);
 assert.match(result.location,/Albia, Iowa/);
 assert.match(result.output,/63 degrees Fahrenheit/);
 assert.match(result.output,/Updated 2026-10-16T18:00 CDT/);
 assert.equal(result.provider,'Open-Meteo');
});
test('weather service outage gives a truthful failed receipt',async()=>{
 const old=globalThis.fetch;globalThis.fetch=async()=>{throw Error('offline');};
 try{
  const r=await call({request:'weather in Albia Iowa'});
  const body=await r.json();assert.equal(body.receipt.status,'failed');
  assert.match(body.output,/no verified conditions/i);
 }finally{globalThis.fetch=old;}
});
test('Google engine results get the Google label only when the upstream engine proves it',async()=>{
 const fetcher=async url=>{
  assert.match(String(url),/engines=google/);
  return Response.json({results:[{title:'Official website',url:'https://weather.gov/forecast',content:'Source excerpt.',engine:'google'}]});
 };
 const found=await webSearch('Search Google for local forecast',{},fetcher);
 assert.equal(found.provider,'Google via Infinity SearXNG');
 assert.equal(found.googleVerified,true);
 assert.equal(found.results[0].url,'https://weather.gov/forecast');
});
test('Google unavailability falls back honestly to the owner search engine and retains a Google button',async()=>{
 let calls=0;
 const fetcher=async url=>{
  calls++;
  if(String(url).includes('engines=google'))return Response.json({results:[]});
  return Response.json({results:[
   {title:'Example source',url:'https://example.org/story',content:'Upstream snippet.',engine:'brave'},
   {title:'Block local',url:'https://127.0.0.1/internal',content:'Ignore',engine:'brave'}
  ]});
 };
 const found=await webSearch('Google search for QuantaPhi',{},fetcher);
 assert.equal(calls,2);
 assert.equal(found.provider,'Infinity Phi / QuantaPhi search');
 assert.equal(found.googleVerified,false);
 assert.equal(found.results.length,1);
 assert.match(found.googleSearchUrl,/^https:\/\/www\.google\.com\/search\?/);
});
test('worker synthesizes grounded live search evidence but does not claim Google when unavailable',async()=>{
 const old=globalThis.fetch;globalThis.fetch=async url=>Response.json({results:[{title:'Public data',url:'https://example.org/report',content:'Recent number.',engine:'brave'}]});
 try{
  const r=await call({request:'Search the web for public data'},{
   AI:{run:async(_,opts)=>{assert.match(opts.messages[1].content,/Public data/);return {response:'According to the search listing, a public data result is available.'};}}
  });
  const body=await r.json();
  assert.equal(body.receipt.tool,'web.search');assert.equal(body.receipt.provider,'Infinity Phi / QuantaPhi search');
  assert.equal(body.sources.length,1);assert.equal(body.googleVerified,false);
 }finally{globalThis.fetch=old;}
});
test('same Android Bubbles conversation bypasses model-only chat for live lookup',()=>{
 const source=fs.readFileSync('bubbles-ai.js','utf8');
 assert.match(source,/nativeGPTAvailable&&!config.privateContext&&!liveLookup/);
 assert.match(source,/bubbles-weather-town/);
 assert.match(source,/ba-search-sources/);
 assert.match(source,/body:JSON.stringify\(lookupPayload\(\)\)/);
});
