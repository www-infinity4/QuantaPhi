import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cleanFeedState,feedCandidates,muteCard,unmuteCard,nextFeedDirection} from '../quanta-feed-rank.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const cards=[
 {id:'gmc-denali-2026',name:'GMC Denali',category:'Vehicles',feature:'Sierra vehicle',study:'Trucks'},
 {id:'radio-vintage',name:'Vintage Radio',category:'Music',feature:'Listen to radio',study:'Music'},
 {id:'museum-history',name:'History Museum',category:'Museums',feature:'Visit museum',study:'History'}
];

test('a Not for me choice suppresses a card for this visitor, never deletes it from the shared catalog',()=>{
 const original=cleanFeedState({following:['gmc-denali-2026'],counts:{'gmc-denali-2026':5000},
  viewed:{'gmc-denali-2026':12},transitions:{'radio-vintage':{'gmc-denali-2026':4},'gmc-denali-2026':{'museum-history':5}}});
 const muted=muteCard(original,'gmc-denali-2026');
 assert.ok(cards.some(c=>c.id==='gmc-denali-2026'));
 assert.deepEqual(muted.muted,['gmc-denali-2026']);
 assert.ok(!muted.counts['gmc-denali-2026'],'old engagement cannot keep suggesting unwanted cards');
 assert.equal(muted.transitions['radio-vintage']?.['gmc-denali-2026'],undefined);
 assert.equal(muted.transitions['gmc-denali-2026'],undefined);
 for(const tab of ['public','for-you','following']){
  assert.ok(!feedCandidates(cards,tab,{...muted,quantScores:{'gmc-denali-2026':70}}).some(c=>c.id==='gmc-denali-2026'),tab);
  assert.notEqual(nextFeedDirection(cards,tab,muted,'radio-vintage').card?.id,'gmc-denali-2026');
 }
 assert.equal(original.muted.length,0,'previous state stays unchanged');
 const restored=unmuteCard(muted,'gmc-denali-2026');
 assert.ok(feedCandidates(cards,'public',restored).some(c=>c.id==='gmc-denali-2026'));
 assert.equal(restored.muted.length,0);
});
test('hidden preferences are sanitized, idempotent and persistable without personal narrative or secrets',()=>{
 const state=cleanFeedState({muted:['gmc-denali-2026','gmc-denali-2026','../bad','BAD'],
  counts:{'gmc-denali-2026':1}});
 assert.deepEqual(state.muted,['gmc-denali-2026']);
 assert.deepEqual(muteCard(state,'../bad'),state);
 assert.deepEqual(muteCard(muteCard(state,'gmc-denali-2026'),'gmc-denali-2026').muted,['gmc-denali-2026']);
 assert.deepEqual(cleanFeedState(JSON.parse(JSON.stringify(state))).muted,['gmc-denali-2026']);
});
test('original Oracle viewer hides inactive registered widgets, keeps an accessible feedback and restore control',()=>{
 const deck=read('oracle-card-deck.js'),css=read('oracle-card-deck.css'),html=read('index.html');
 assert.match(html,/id="oracleCardNotForMe"/);
 assert.match(html,/id="oracleCardHiddenList"/);
 assert.match(deck,/muteCard\(readDirections\(\),active\.feedId\)/);
 assert.match(deck,/unmuteCard/);
 assert.match(deck,/oracleDeckManaged/);
 assert.match(css,/data-oracle-deck-managed/);
 assert.match(css,/#oracleCardStage/);
 assert.match(deck,/stage\.append\(entry\.node\)/,'use real source nodes, not duplicate previews');
 assert.doesNotMatch(deck,/cloneNode/);
});
