import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handle} from '../workers/media-star-following/worker.js';

const request=new Request('https://media-star-following-spaces.marvaseater.workers.dev/v1/curated/asteroid');
test('the public curated endpoint reads only ASTEROID RADIO from D1 without a wallet token',async()=>{
 let sql='';
 const env={DB:{prepare(query){sql=query;return {all:async()=>({results:[
  {id:'1pKdRbWZgVRJW',title:'ASTEROID RADIO: $DOG TONIGHT - BUY ON KRAKEN',source:'https://x.com/i/spaces/1pKdRbWZgVRJW',date:'2026-03-25',durationSeconds:11915,availability:'indexed'}
 ]})}}}};
 const response=await handle(request,env);
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.ok,true);
 assert.equal(data.handle,'A5T3R0lD');
 assert.equal(data.episodes.length,1);
 assert.equal(data.episodes[0].duration,'3:18:35');
 assert.equal(data.playbackVerified,false);
 assert.equal(data.archiveComplete,false);
 assert.match(sql,/lower\(h\.handle\)='a5t3r0ld'/);
 assert.doesNotMatch(JSON.stringify(data),/sq_[a-z0-9]/i);
});
test('database failure is not misreported as an empty verified collection',async()=>{
 const response=await handle(request,{DB:{prepare:()=>{throw Error('offline')}}});
 assert.equal(response.status,503);
 assert.equal((await response.json()).error,'curated_catalog_unavailable');
});
test('D1 seed is idempotent and keeps Fred entitlement storage untouched',()=>{
 const sql=readFileSync(new URL('../workers/media-star-following/migrations/20261118-asteroid-radio.sql',import.meta.url),'utf8');
 assert.match(sql,/INSERT OR IGNORE INTO space_episodes/);
 assert.match(sql,/WHERE NOT EXISTS/);
 assert.match(sql,/source_type,availability/);
 assert.doesNotMatch(sql,/(?:UPDATE|DELETE)\s+(?:fred|starcoin|wallet|entitlement)/i);
});
test('homepage and Bubbles register the same Asteroid module and root',()=>{
 const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const cards=readFileSync(new URL('../bubbles-card-catalog.mjs',import.meta.url),'utf8');
 assert.match(home,/id="asteroidSpacesRadio"/);
 assert.match(home,/asteroid-spaces-radio\.mjs/);
 assert.match(cards,/local\('asteroid-spaces','ASTEROID RADIO Spaces','asteroidSpacesRadio'/);
 assert.match(cards,/\['followingSpacesRadio','asteroidSpacesRadio'\]/);
});
