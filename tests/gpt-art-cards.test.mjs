import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GPT_ART_CARDS,eligibleArtCards} from '../gpt-art-catalog.mjs';
import {BUILDER_CARDS} from '../developer-carousel-core.mjs';
import {OWNER_SYSTEMS,ownerCardReady,ownerCtaUrl} from '../owner-engineer-core.mjs';
const src=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('twenty independent original art records remain gated, and the adult photo is reserved for Developer',()=>{
 assert.equal(GPT_ART_CARDS.length,20);
 assert.equal(new Set(GPT_ART_CARDS.map(c=>c.id)).size,20);
 assert.equal(eligibleArtCards().length,0);
 const portrait=GPT_ART_CARDS.find(c=>c.id==='gpt-portrait-study');
 assert.ok(portrait);
 assert.equal(eligibleArtCards([{...portrait,ready:true,rights:'reviewed'}]).length,0);
 const fantasy=GPT_ART_CARDS.find(c=>c.id==='fantasy-golden-portal');
 assert.deepEqual(eligibleArtCards([{...fantasy,ready:true,rights:'reviewed'}]).map(x=>x.id),['fantasy-golden-portal']);
});
test('the actual owner-authorized image is present and byte-identical to the verified Git blob',()=>{
 const image=new URL('../assets/gpt-art/gpt-owner-engineer.webp',import.meta.url);
 assert.ok(existsSync(image));
 const b=readFileSync(image);
 assert.equal(b.subarray(0,4).toString('ascii'),'RIFF');
 assert.equal(b.subarray(8,12).toString('ascii'),'WEBP');
 const hash=createHash('sha1').update('blob '+b.length+String.fromCharCode(0)).update(b).digest('hex');
 assert.equal(hash,'a48bbd4768eef50f116e61fecc1b6fe7400c64de');
});
test('owner engineering card covers the separate wallet and bot/search projects',()=>{
 assert.equal(OWNER_SYSTEMS.length,8);
 assert.ok(OWNER_SYSTEMS.some(x=>x.id==='unified-wallet'&&/separate/i.test(x.summary)));
 assert.equal(ownerCardReady({imageLoaded:true,rights:'owner-approved'}),true);
 assert.equal(ownerCardReady({imageLoaded:false,rights:'owner-approved'}),false);
 assert.equal(BUILDER_CARDS.length,6);
 assert.equal(BUILDER_CARDS.at(-1).id,'ownerEngineerCard');
});
test('existing Oracle and Developer carousels are both wired to real cards, with GPT viewer handoff',()=>{
 assert.match(src('index.html'),/id="gptArtworkQuickCards"/);
 assert.ok(src('index.html').includes('src="/gpt-art-quick-cards.mjs'));
 assert.ok(src('oracle-card-deck.js').includes('#gptArtworkQuickCards .iqc-card[data-source-id]'));
 assert.match(src('developer-carousel.mjs'),/buildOwnerDeveloperCard/);
 assert.match(src('gpt-art-quick-cards.mjs'),/Create with GPT/);
 assert.equal(ownerCtaUrl(),'/creator-gpt-handoff.html');
 assert.ok(src('quanta-official-viewer.mjs').includes('https://chatgpt.com/'));
});
