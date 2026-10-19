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
