import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {INTEGRA_X_TOUR_STEPS,xTourStep,mountIntegraXTour} from '../quanta-integra-x-tour.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Integra tour has unique topic steps and grounded HTTPS source links',()=>{
 assert.equal(INTEGRA_X_TOUR_STEPS.length,7);
 assert.equal(new Set(INTEGRA_X_TOUR_STEPS.map(s=>s.id)).size,7);
 for(const step of INTEGRA_X_TOUR_STEPS){
  assert.ok(step.title&&step.body&&step.link);
  const url=new URL(step.url);
  assert.equal(url.protocol,'https:');
  assert.ok(['x.com','help.x.com','docs.x.com'].includes(url.hostname),url.hostname);
  assert.equal(url.username,'');assert.equal(url.password,'');
  assert.ok(Object.isFrozen(step));
 }
 assert.equal(xTourStep(0).id,'discover');
 assert.equal(xTourStep(5).id,'developer');
 assert.equal(xTourStep(-20).id,'discover');
 assert.equal(xTourStep(200).id,'discover');
 assert.equal(typeof mountIntegraXTour,'function');
});

test('only X source-card renderer receives the guide ahead of its existing controls',()=>{
 const source=read('quanta-card-experience.mjs');
 assert.match(source,/import \{mountIntegraXTour\} from '\.\/quanta-integra-x-tour\.mjs'/);
 assert.match(source,/if\(id==='x'\)mountIntegraXTour\(root\)/);
 assert.match(source,/mountCardActions\(root,card,\{showSearch:!alreadyHasSearch&&!liveSourceProfile\(id\)\}\)/);
 const toolbar=read('quanta-card-actions.mjs');
 assert.match(toolbar,/mountXComposer\(bar\)/);
 assert.match(read('quanta-card-experience.css'),/\.qcx-integra-tour/);
});

test('Integra tour never takes over account sessions or implies a live social agent',()=>{
 const src=read('quanta-integra-x-tour.mjs');
 for(const word of ['fetch(', 'localStorage','sessionStorage','document.cookie','postMessage(', 'Authorization','TINYFISH_API_KEY','/api/x/post']){
  assert.ok(!src.includes(word),word);
 }
 assert.match(src,/not a live @IntegraAI chat/);
 assert.match(src,/No social message is sent/);
 assert.match(src,/previous\.disabled=index===0/);
 assert.match(src,/aria-live/);
});
