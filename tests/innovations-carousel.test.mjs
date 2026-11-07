import test from 'node:test';
import assert from 'node:assert/strict';
import {INNOVATION_CARDS, innovationById, nextInnovationIndex, researchQueryFor, validateInnovation} from '../innovations-carousel-core.mjs';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Solar Paint is first, evidence-linked and not misrepresented as a purchasable product',()=>{
 const first=INNOVATION_CARDS[0];
 assert.equal(first.id,'solar-paint');
 assert.equal(first.source,'https://8msolar.com/solar-paint-turning-any-surface-into-a-solar-panel/');
 assert.equal(first.readiness,'research');
 assert.match(first.caveat,/not.*retail|experimental|not.*available/i);
 assert.ok(first.sourceDate);
 assert.ok(first.image.startsWith('/innovations/'));
 assert.match(first.imageAlt,/concept|illustration/i);
 assert.equal(first.buyUrl,undefined);
});
test('similar discoveries are source-backed, independently pictured and unique',()=>{
 assert.ok(INNOVATION_CARDS.length>=3);
 assert.equal(new Set(INNOVATION_CARDS.map(c=>c.id)).size,INNOVATION_CARDS.length);
 assert.equal(new Set(INNOVATION_CARDS.map(c=>c.image)).size,INNOVATION_CARDS.length);
 for(const card of INNOVATION_CARDS){
  assert.equal(validateInnovation(card),true,card.id);
  assert.ok(card.summary.length>=20 && card.caveat.length>=12);
  assert.match(card.source,/^https:\/\//);
  assert.equal(innovationById(card.id),card);
 }
 assert.equal(innovationById('not-a-card'),null);
 assert.equal(validateInnovation({...INNOVATION_CARDS[0],source:'http://127.0.0.1/secrets'}),false);
 assert.equal(validateInnovation({...INNOVATION_CARDS[0],image:'https://unlicensed.example/hero.png'}),false);
});
test('carousel wrap is controlled and never fabricates additional cards',()=>{
 const count=INNOVATION_CARDS.length;
 assert.equal(nextInnovationIndex(count-1,1,count),0);
 assert.equal(nextInnovationIndex(0,-1,count),count-1);
 assert.equal(nextInnovationIndex(0,1,1),0);
 assert.equal(nextInnovationIndex(0,1,0),-1);
 assert.equal(nextInnovationIndex(5,1,0),-1);
});
test('research prompts are bounded and non-executing',()=>{
 assert.match(researchQueryFor('solar-paint'),/photovoltaic coating|solar paint/i);
 assert.match(researchQueryFor('solar-windows'),/photovoltaic windows/i);
 assert.equal(researchQueryFor('injected script'),null);
});
test('dedicated image-led Innovations carousel is wired next to science without false Buy or invented AI',()=>{
 const html=source('index.html'),render=source('innovations-carousel.mjs'),css=source('innovations-carousel.css');
 assert.match(html,/id="innovationsCarousel"[^>]*aria-roledescription="carousel"/);
 assert.match(html,/src="\/innovations-carousel\.mjs\?/);
 assert.match(html,/href="\/innovations-carousel\.css\?/);
 assert.match(render,/mountCardActions/);
 assert.match(render,/innovations-card-image/);
 assert.match(render,/card\.hidden=i!==index/);
 assert.match(render,/getElementById\('go'\)/);
 assert.doesNotMatch(render,/fetch\([^)]*https?:\/\//i,'no unsanctioned external scraping in page');
 assert.doesNotMatch(html,/id="innovationBuy"/);
 assert.match(css,/min-height:44px/);
});