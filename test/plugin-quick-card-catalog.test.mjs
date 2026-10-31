import test from 'node:test';
import assert from 'node:assert/strict';
import {PLUGIN_QUICK_CARDS,PLUGIN_CATEGORIES,pluginQuickCard} from '../plugin-quick-card-catalog.mjs';
import {lookupQuickCard,searchQuickCards} from '../quick-card-search-core.mjs';
import {tinyfishCard} from '../tinyfish-card-catalog.mjs';

test('screenshot services each have their own safe card and deep link',()=>{
 assert.equal(PLUGIN_QUICK_CARDS.length,56);
 assert.equal(new Set(PLUGIN_QUICK_CARDS.map(c=>c.id)).size,PLUGIN_QUICK_CARDS.length);
 assert.ok(PLUGIN_CATEGORIES.length>=10);
 for(const card of PLUGIN_QUICK_CARDS){
  assert.match(card.id,/^plugin-[a-z0-9-]+$/);
  const u=new URL(card.official);
  assert.equal(u.protocol,'https:');
  assert.equal(u.username,'');assert.equal(u.password,'');assert.equal(u.port,'');
  assert.equal(card.url,card.official);
  assert.ok(card.name.length>1);
  assert.match(card.route,/^\/plugin-quick-cards\.html\?card=plugin-/);
  assert.equal(lookupQuickCard(card.id)?.name,card.name);
  assert.equal(tinyfishCard(card.id)?.url,card.official);
 }
});
test('all key screenshot brands are discoverable by the common homepage search',()=>{
 for(const [name,id] of [
  ['Codex Security','plugin-codex-security'],
  ['Shopify','plugin-shopify'],
  ['Blockscout Blockchain Data','plugin-blockscout'],
  ['Undermind','plugin-undermind'],
  ['Flaim Fantasy','plugin-flaim-fantasy'],
  ['Remote Desktop Commander','plugin-remote-desktop-commander'],
  ['PostHog','plugin-posthog'],
  ['Molecular Structure Viewer','plugin-molecular-structure-viewer'],
  ['Kleinanzeigen','plugin-kleinanzeigen'],
  ['AJAXX Data Scrubber','plugin-ajaxx-data-scrubber']
 ]){
  assert.ok(searchQuickCards(name,{limit:8}).some(c=>c.id===id),name);
 }
});
test('unverified generic plugin endpoints clearly identify directory handoff',()=>{
 for(const card of PLUGIN_QUICK_CARDS.filter(c=>c.mode==='directory')){
  assert.equal(new URL(card.official).hostname,'chatgpt.com');
  assert.match(card.description,/not been verified/i);
 }
 for(const input of ['__proto__','constructor','unknown','plugin-unknown',null]){
  assert.equal(pluginQuickCard(input),null);
 }
});

test('specific ChatGPT plugin handoffs are verified destinations, never inherited sessions',()=>{
 for(const id of ['ajaxx-data-scrubber','flaim-fantasy','steer-astro','freddy']){
  const card=pluginQuickCard('plugin-'+id);
  assert.ok(card,'missing '+id);
  const link=new URL(card.pluginUrl);
  assert.equal(link.origin,'https://chatgpt.com');
  assert.match(link.pathname,/^\/plugins\//);
  assert.equal(link.username,'');assert.equal(link.password,'');
  assert.notEqual(card.pluginUrl,card.route);
 }
 assert.equal(pluginQuickCard('plugin-shopify').pluginUrl,null);
 assert.equal(pluginQuickCard('plugin-daily-tarot').pluginUrl,null,'Unmatched Tarot provider must not impersonate Daily Tarot');
});

test('reader readiness confirms only the exact trusted backend card and destination',async()=>{
 const {checkCardWebsiteReadiness}=await import('../tinyfish-card-reader.mjs');
 const observed=[];
 const ready=await checkCardWebsiteReadiness('plugin-etsy',{fetcher:async(url,options)=>{
  observed.push({url,options});
  return Response.json({ok:true,cardId:'plugin-etsy',provider:'TinyFish',
   configured:true,actions:['inspect','search'],messageSupported:false,sourceUrl:'https://www.etsy.com/'});
 }});
 assert.equal(ready.configured,true);
 assert.equal(ready.sourceUrl,'https://www.etsy.com/');
 assert.equal(observed.length,1);
 assert.equal(JSON.parse(observed[0].options.body).action,'capabilities');
 assert.equal(observed[0].options.credentials,'omit');
 assert.equal(observed[0].options.cache,'no-store');
 await assert.rejects(checkCardWebsiteReadiness('plugin-etsy',{fetcher:async()=>Response.json({
  ok:true,cardId:'plugin-etsy',provider:'TinyFish',configured:true,actions:['inspect','search'],
  sourceUrl:'https://evil.example/'
 })}),/unexpected source/i);
 await assert.rejects(checkCardWebsiteReadiness('plugin-etsy',{fetcher:async()=>Response.json({
  ok:true,cardId:'plugin-shopify',provider:'TinyFish',configured:true,actions:['inspect','search'],
  sourceUrl:'https://www.etsy.com/'
 })}),/unverified website reader/i);
});

test('reader readiness clearly blocks old Worker registries and unconfigured backends',async()=>{
 const {checkCardWebsiteReadiness}=await import('../tinyfish-card-reader.mjs');
 await assert.rejects(checkCardWebsiteReadiness('plugin-etsy',{fetcher:async()=>Response.json({
  ok:false,error:'card_not_registered'
 },{status:400})}),/worker update required/i);
 await assert.rejects(checkCardWebsiteReadiness('plugin-etsy',{fetcher:async()=>Response.json({
  ok:true,cardId:'plugin-etsy',provider:'TinyFish',configured:false,actions:['inspect','search'],
  sourceUrl:'https://www.etsy.com/'
 })}),/awaiting activation/i);
 await assert.rejects(checkCardWebsiteReadiness('plugin-missing'),/not connected/i);
});
