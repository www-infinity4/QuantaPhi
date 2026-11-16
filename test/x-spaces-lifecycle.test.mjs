import test from 'node:test';
import assert from 'node:assert/strict';
import {FRED_SHARED_POST, validateSpaceObservation, planSpaceHandoff} from '../x-spaces-lifecycle.mjs';

const source='https://x.com/i/spaces/1OyKAjYPeXqGb';
const base={source:'x_api_lifecycle',postId:FRED_SHARED_POST.postId,spaceUrl:source,host:'dotkrueger',state:'live',observedAt:'2026-11-07T23:10:00Z'};
const now='2026-11-07T23:11:00Z';

test('owner supplied tweet is a source link, not a live Space claim',()=>{
 assert.equal(FRED_SHARED_POST.url,'https://x.com/dotkrueger/status/2119202415702605899');
 assert.equal(planSpaceHandoff(null,{now}).stage,'unverified');
});
test('only recent exact-post X lifecycle evidence can claim live',()=>{
 assert.equal(planSpaceHandoff(base,{now}).stage,'live');
 assert.equal(planSpaceHandoff(base,{now}).showInLive,true);
 assert.equal(planSpaceHandoff({...base,postId:'99999'}, {now}).stage,'unverified');
 assert.equal(planSpaceHandoff({...base,source:'owner_import'}, {now}).stage,'unverified');
 assert.equal(planSpaceHandoff({...base,observedAt:'2026-11-06T10:00:00Z'}, {now}).stage,'unverified');
 assert.equal(planSpaceHandoff({...base,spaceUrl:'https://not-x.example/i/spaces/1OyKAjYPeXqGb'}, {now}).stage,'unverified');
});
test('confirmed ended hides live slot; a separate replay confirmation permits only a Media Star candidate',()=>{
 const ended={...base,state:'ended',endedAt:'2026-11-07T23:10:00Z'};
 assert.equal(planSpaceHandoff(ended,{now}).showInLive,false);
 assert.equal(planSpaceHandoff(ended,{now}).mediaStarEpisode,null);
 const result=planSpaceHandoff({...ended,replayAvailable:true,replayUrl:source},{now});
 assert.equal(result.mediaStarEpisode.url,source);
 assert.equal(result.mediaStarEpisode.hiddenFromLive,true);
 assert.equal(result.mediaStarEpisode.requiresEditorialImport,true);
});
test('bad data cannot silently create an episode or charge a wallet',()=>{
 assert.equal(validateSpaceObservation({...base,spaceUrl:'javascript:alert(1)'},{now}),false);
 for(const observation of [undefined,{}, {...base,state:'ended',source:'manual'},
   {...base,state:'ended',postId:'unknown'}, {...base,state:'ended',replayUrl:'http://evil.example'}]){
  assert.equal(planSpaceHandoff(observation,{now}).mediaStarEpisode,null);
 }
});
