import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAsteroidEpisode, normalizeAsteroidCatalog, chooseNextAsteroid} from '../asteroid-spaces-model.mjs';
import {readFileSync} from 'node:fs';

const good={source:'https://twitter.com/i/spaces/1pKdRbWZgVRJW',title:'ASTEROID RADIO: $DOG TONIGHT - BUY ON KRAKEN',date:'2026-03-25',availability:'indexed'};

test('only original X Space links become episodes, never ordinary X posts',()=>{
 assert.equal(normalizeAsteroidEpisode({...good,source:'https://x.com/A5T3R0lD/status/2123131588548387160'}),null);
 assert.equal(normalizeAsteroidEpisode({...good,source:'https://fake.example/i/spaces/1pKdRbWZgVRJW'}),null);
 assert.equal(normalizeAsteroidEpisode({...good,source:'http://x.com/i/spaces/1pKdRbWZgVRJW'}),null);
 assert.equal(normalizeAsteroidEpisode({...good,availability:'unavailable'}),null);
 assert.equal(normalizeAsteroidEpisode(good).source,'https://x.com/i/spaces/1pKdRbWZgVRJW');
});
test('catalog deduplicates and does not import unrelated host appearances',()=>{
 const episodes=normalizeAsteroidCatalog([good,{...good,title:'Duplicate'},{...good,handle:'SomeoneElse',source:'https://x.com/i/spaces/1pKdRbWZgVRJX'}]);
 assert.equal(episodes.length,1);
 assert.equal(episodes[0].id,'1pKdRbWZgVRJW');
 assert.equal(episodes[0].playbackVerified,false);
});
test('no-repeat shuffle uses the remaining records until the next round',()=>{
 const a={id:'one'},b={id:'two'},c={id:'three'},list=[a,b,c];
 assert.equal(chooseNextAsteroid(list,'one',['one'],0).id,'two');
 assert.equal(chooseNextAsteroid(list,'one',['one','two'],0).id,'three');
 assert.notEqual(chooseNextAsteroid(list,'one',['one','two','three'],0).id,'one');
 assert.equal(chooseNextAsteroid([],null,[],0),null);
});
test('source-backed static index contains only direct Space records',()=>{
 const raw=JSON.parse(readFileSync(new URL('../asteroid-spaces-index.json',import.meta.url),'utf8'));
 assert.equal(raw.handle,'A5T3R0lD');
 assert.equal(raw.episodes.length,1);
 assert.equal(normalizeAsteroidCatalog(raw.episodes).length,1);
 assert.match(raw.discoveryPost,/^https:\/\/x\.com\/A5T3R0lD\/status\/[0-9]+$/);
});
