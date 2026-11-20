import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {companionRotationAllowed,nextCompanionPage} from '../shop-phi-switchboard.mjs';
import {cardImageCandidates} from '../infinity-accepted-cards.mjs';

const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('two visible companion cards advance through every available page and wrap',()=>{
 assert.equal(nextCompanionPage(0,6),1);
 assert.equal(nextCompanionPage(1,6),2);
 assert.equal(nextCompanionPage(2,6),0);
 assert.equal(nextCompanionPage(0,2),0);
 assert.equal(nextCompanionPage(0,0),0);
 assert.equal(nextCompanionPage(500,5),0);
});
test('automatic companion rotation respects visibility, input focus, pause and reduced motion',()=>{
 const active={total:6,visible:true,pageHidden:false,focused:false,shelfOpen:false,paused:false,reducedMotion:false};
 assert.equal(companionRotationAllowed(active),true);
 for(const key of ['pageHidden','focused','shelfOpen','paused','reducedMotion']){
  assert.equal(companionRotationAllowed({...active,[key]:true}),false,key);
 }
 assert.equal(companionRotationAllowed({...active,visible:false}),false);
 assert.equal(companionRotationAllowed({...active,total:2}),false);
});
test('real manufacturer product imagery precedes logo and OG identity images',()=>{
 const card={images:['https://media.example/miele-og-image01.png','https://media.example/products/washer.png']};
 assert.deepEqual(cardImageCandidates(card),[card.images[1],card.images[0]]);
});
test('accepted brand controls use legible phone layout without reducing their functions',()=>{
 const css=source('infinity-accepted-cards.css');
 assert.match(css,/\.iac-card \.qca-controls\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\.iac-logo-only/);
 const engine=source('shop-phi-switchboard.mjs');
 assert.match(engine,/setInterval\(/);
 assert.match(engine,/companionRotationAllowed\(/);
 assert.match(engine,/aria-pressed/);
});
