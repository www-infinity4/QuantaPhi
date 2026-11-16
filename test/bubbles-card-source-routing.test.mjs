import test from 'node:test';
import assert from 'node:assert/strict';
import {cardSourcePlanFor} from '../workers/bubbles-tools/card-source.mjs';
import {cards} from '../bubbles-card-catalog.mjs';
import {chooseTool} from '../workers/bubbles-tools/worker.mjs';
test('source-first engineering request grounded to existing registered Bitcoin Crusher card',()=>{
 const prompt='Our old Bitcoin Crusher looked like a Copilot game. Plan the migration into the existing Bitcoin Crusher card and a real research system with Oracle Octaves white cards.';
 assert.deepEqual(cardSourcePlanFor(prompt),{
  repository:'www-infinity4/Bitcoin-Crusher',path:'README.md',card:'bitcoin-crusher',liveRoute:'/bitcoin-crusher/'
 });
 assert.equal(chooseTool(prompt),'github.read_file');
});
test('registered Infinity sites use actual card manifest, never guessed owner repos',()=>{
 assert.equal(cardSourcePlanFor('Please audit Infinity Radio player').repository,'www-infinity4/Alien-Radio');
 assert.equal(cardSourcePlanFor('Redesign Omni TV pages').repository,'www-infinity4/Omni-TV');
 assert.equal(cardSourcePlanFor('Repair qdrant fork homepage'),null);
 assert.equal(cardSourcePlanFor('Build a random new GitHub library'),null);
 assert.equal(cardSourcePlanFor('Audit radio electronics antenna'),null);
 assert.equal(cardSourcePlanFor('Repair both Bitcoin Crusher and Infinity Radio'),null);
});
test('ordinary conversation, model drafts, play commands and direct weather do not trigger repair scans',()=>{
 for(const s of ['What is Bitcoin Crusher?','Play Bitcoin Crusher music','Do not fix Bitcoin Crusher','What is the weather in Albia?','Review this excerpt: <button>Play</button>'])
  assert.equal(cardSourcePlanFor(s),null,s);
 assert.equal(chooseTool('Play Bitcoin Crusher music'),'oracle.chat');
 assert.equal(chooseTool('What is the weather in Albia?'),'weather.current');
});
test('existing QuantaPhi is not arbitrarily queried as an external card and source drafts remain inert',()=>{
 assert.equal(cardSourcePlanFor('Fix the QuantaPhi home card'),null);
 const draft='Write source document README.md for an example mentioning Bitcoin Crusher but not fetching it';
 assert.equal(chooseTool(draft),'oracle.chat');
});

test('engineering source plans preserve the declared live route for every external card',()=>{
 for(const card of cards.filter(c=>c.repository!=='www-infinity4/QuantaPhi')){
  const plan=cardSourcePlanFor('Please inspect '+card.title);
  assert.ok(plan,card.title);
  assert.equal(plan.repository,card.repository);
  assert.equal(plan.liveRoute,card.url,card.title+' public route must not be derived from its repo name');
 }
 assert.equal(cardSourcePlanFor('Audit Infinity Radio').liveRoute,'/infinity-radio/');
 assert.equal(cardSourcePlanFor('Audit Infinity Phi').liveRoute,'/infinity-phi/');
 assert.equal(cardSourcePlanFor('Audit McKee Coins').liveRoute,'/mckee-coins/');
});
