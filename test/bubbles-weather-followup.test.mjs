import test from 'node:test';
import assert from 'node:assert/strict';
import {currentWeather,forecastDate} from '../workers/bubbles-tools/search.mjs';
test('tomorrow follows location calendar across UTC midnight',()=>{
 assert.equal(forecastDate('tomorrow','America/Chicago',new Date('2026-10-19T03:00:00Z')),'2026-10-19');
 assert.equal(forecastDate('tomorrow','Pacific/Auckland',new Date('2026-10-19T03:00:00Z')),'2026-10-20');
});
function provider(daily){return async url=>({ok:true,text:async()=>JSON.stringify(String(url).includes('geocoding-api')?{results:[{name:'Lovilia',admin1:'Iowa',country:'United States',latitude:41.13,longitude:-92.91}]}:{timezone:'America/Chicago',daily})});}
test('tomorrow uses matching date rather than first array position',async()=>{
 const date=forecastDate('tomorrow','America/Chicago');
 const result=await currentWeather('weather tomorrow','Lovilia, Iowa',provider({time:['2000-01-01',date],temperature_2m_max:[99,61],temperature_2m_min:[88,42],precipitation_probability_max:[100,15]}));
 assert.equal(result.ok,true);assert.equal(result.forecastDate,date);
 assert.match(result.output,/high of 61 and low of 42/);assert.match(result.output,/15 percent/);
});
test('missing requested forecast is an explicit failure',async()=>{
 const result=await currentWeather('weather tomorrow','Lovilia, Iowa',provider({time:['2000-01-01'],temperature_2m_max:[99],temperature_2m_min:[88]}));
 assert.equal(result.ok,false);assert.match(result.output,/did not return a complete forecast/);
});
test('provider outage returns error text',async()=>{
 const result=await currentWeather('weather tomorrow','Lovilia, Iowa',async()=>{throw Error('offline')});
 assert.equal(result.ok,false);assert.match(result.output,/could not reach/);
});

test('US ZIP uses country filter and cannot select same-number foreign postcode',async()=>{
 const date=forecastDate('tomorrow','America/Chicago');let geocode;
 const result=await currentWeather('weather tomorrow for 50150','Seattle',async url=>{
  if(String(url).includes('geocoding-api')){geocode=new URL(url);return {ok:true,text:async()=>JSON.stringify({results:[
   {name:'Wrong city',country_code:'ES',latitude:41,longitude:-1},
   {name:'Lovilia',admin1:'Iowa',country:'United States',country_code:'US',latitude:41.13,longitude:-92.91}
  ]})};}
  return {ok:true,text:async()=>JSON.stringify({timezone:'America/Chicago',daily:{time:[date],temperature_2m_max:[60],temperature_2m_min:[40]}})};
 });
 assert.equal(geocode.searchParams.get('countryCode'),'US');assert.equal(geocode.searchParams.get('name'),'50150');
 assert.match(result.location,/Lovilia, Iowa/);assert.equal(result.ok,true);
});
test('explicit city overrides saved city',async()=>{
 let query;
 await currentWeather('weather in Miami','Seattle',async url=>{query=new URL(url).searchParams.get('name');return {ok:true,text:async()=>JSON.stringify({results:[]})}});
 assert.equal(query,'Miami');
});
