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
const weatherFetch=async url=>Response.json(String(url).includes('geocoding-api.open-meteo.com')?loc:mockForecast);
test('actual voice request, not persona history, selects the web and weather tools',()=>{
 assert.equal(chooseTool('What is the weather in Albia, Iowa?'),'weather.current');
 assert.equal(chooseTool("What's it like outside?"),'weather.current');
 assert.equal(chooseTool('Do I need an umbrella?'),'weather.current');
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
 assert.match(source,/do i need an umbrella/);
 assert.match(source,/sourceTool\?/);
 assert.match(source,/ba-search-sources/);
 assert.match(source,/body:JSON.stringify\(lookupPayload\(\)\)/);
});

test('Cloudflare lookup fetch uses supported manual redirects and never follows an upstream 302',async()=>{
 let count=0;
 const fetcher=async (url,options)=>{
  count++;
  assert.equal(options.redirect,'manual');
  return new Response(null,{status:302,headers:{Location:'https://example.com/redirected'}});
 };
 const result=await webSearch('Search Google for cloudflare weather',{},fetcher);
 assert.equal(result.ok,false);
 assert.equal(result.results.length,0);
 assert.equal(count,2); // Google SearXNG attempt and owner-broker fallback; neither follows redirects.
 assert.deepEqual(result.attempts,['searxng_google_unavailable','infinity_search_unavailable']);
});
test('weather uses supported redirect mode for both live geocoding and forecast',async()=>{
 const requests=[];
 const fetcher=async(url,options)=>{
  requests.push({url:String(url),redirect:options.redirect});
  return Response.json(String(url).includes('geocoding-api.open-meteo.com')?loc:mockForecast);
 };
 const result=await currentWeather('weather in Albia, Iowa',null,fetcher);
 assert.equal(result.ok,true);
 assert.equal(requests.length,2);
 assert.ok(requests.every(r=>r.redirect==='manual'));
});

test('Grammar Phi routes three conversational weather phrasings to the same live tool receipt',async()=>{
 const examples=[
  'How chilly does it feel around Albia, Iowa this afternoon?',
  'I am heading outside in Albia Iowa; should I bring a jacket?',
  'Can you find out what it feels like outdoors in Albia, Iowa?'
 ];
 const original=globalThis.fetch;
 const calls=[];
 globalThis.fetch=async url=>{
  calls.push(String(url));
  return Response.json(String(url).includes('geocoding-api')?
   {results:[{name:'Albia',admin1:'Iowa',country:'United States',latitude:41.0267,longitude:-92.8053}]}:
   {current:{temperature_2m:42,apparent_temperature:37,weather_code:2,wind_speed_10m:11,time:'2026-10-20T15:00'},
    daily:{temperature_2m_max:[49],temperature_2m_min:[36],precipitation_probability_max:[15]},
    timezone:'America/Chicago',timezone_abbreviation:'CDT'});
 };
 try{
  for(const phrase of examples){
   assert.equal(chooseTool(phrase),'oracle.chat','ordinary phrase should require semantic selection');
   let selections=0;
   const response=await call({request:phrase,mcp:true},{
    AI:{run:async(_model,options)=>{
     if(!options.tools)throw Error('tool selector should return the sourced reply directly');
     selections++;
     return {choices:[{message:{tool_calls:[{function:{name:'weather_current',arguments:JSON.stringify({location:'Albia, Iowa'})}}]}}]};
    }}
   });
   const data=await response.json();
   assert.equal(selections,1);
   assert.equal(data.receipt.tool,'weather.current');
   assert.equal(data.receipt.selection,'structured_function_call');
   assert.equal(data.receipt.status,'complete');
   assert.match(data.output,/42 degrees Fahrenheit/);
  }
  assert.equal(calls.length,6,'one geocode and one actual weather fetch per request');
 }finally{globalThis.fetch=original}
});
test('ambiguous conversational weather cannot invent a city from the model',async()=>{
 const original=globalThis.fetch;
 let networkCalls=0;
 globalThis.fetch=async()=>{networkCalls++;throw Error('must not fetch invented town')};
 try{
  const response=await call({request:'Should I wear a coat when I go outside?',mcp:true},{
   AI:{run:async()=>({choices:[{message:{tool_calls:[{function:{name:'weather_current',arguments:'{"location":"Albia, Iowa"}'}}]}}]})}
  });
  const data=await response.json();
  assert.equal(data.receipt.tool,'weather.current');
  assert.equal(data.receipt.status,'needs_input');
  assert.match(data.output,/Which town and state/i);
  assert.equal(networkCalls,0);
 }finally{globalThis.fetch=original}
});
test('model-suggested tools never turn a repository repair or greeting into a read-only action',async()=>{
 let selections=0,chats=0;
 const env={AI:{run:async(_model,options)=>{
  if(options.tools){
   selections++;
   return {choices:[{message:{tool_calls:[]}}]};
  }
  chats++;
  return {response:'No repository edit or live tool call was verified.'};
 }}};
 let r=await call({request:'Please repair my QuantaPhi repository',mcp:true},env);
 let data=await r.json();
 assert.equal(data.receipt.tool,'oracle.chat');
 assert.equal(selections,0,'write intent is excluded from read-only tool selection');
 assert.equal(chats,1);
 r=await call({request:'Hello Bubbles',mcp:true},env);
 data=await r.json();
 assert.equal(data.receipt.tool,'oracle.chat');
 assert.equal(selections,1);
 assert.equal(chats,2);
});

test('shallow weather parser defers to grounded semantic selection for city named before forecast',async()=>{
 const phrase='How chilly does it feel around Albia, Iowa this afternoon? Please verify the forecast.';
 assert.equal(chooseTool(phrase),'weather.current');
 const original=globalThis.fetch;
 let network=0;
 globalThis.fetch=async url=>{
  network++;
  return Response.json(String(url).includes('geocoding-api')?
   {results:[{name:'Albia',admin1:'Iowa',country:'United States',latitude:41.0267,longitude:-92.8053}]}:
   {current:{temperature_2m:42,apparent_temperature:37,weather_code:2,wind_speed_10m:8,time:'2026-10-20T15:00'},
    daily:{temperature_2m_max:[49],temperature_2m_min:[36]},timezone:'America/Chicago'});
 };
 try{
  const response=await call({request:phrase,mcp:true},{
   AI:{run:async()=>({choices:[{message:{tool_calls:[{function:{name:'weather_current',arguments:'{"location":"Albia, Iowa"}'}}]}}]})}
  });
  const body=await response.json();
  assert.equal(body.receipt.tool,'weather.current');
  assert.equal(body.receipt.status,'complete');
  assert.match(body.output,/42 degrees Fahrenheit/);
  assert.equal(network,2);
 }finally{globalThis.fetch=original}
});
