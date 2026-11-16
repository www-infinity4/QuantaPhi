import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {findSourceCard,isPublicSourceCard,validSourceCard} from '../source-quick-cards.mjs';

test('Microsoft AI fork appears as an actionable, source-verified Bubbles Quick Card',()=>{
 const card=findSourceCard('microsoft-ai-builder');
 assert.ok(card,'Microsoft AI builder card must exist');
 assert.equal(card.official,'https://github.com/microsoft/AI');
 assert.equal(card.featureUrl,'https://github.com/www-infinity4/AI3');
 assert.equal(card.secondUrl,'https://github.com/www-infinity4/AI3');
 assert.equal(card.secondLabel,'Your Microsoft AI fork');
 assert.match(card.focus,/signed.*runner/i);
 assert.match(card.details,/no automatic publishing/i);
 assert.equal(validSourceCard(card),true);
 assert.equal(isPublicSourceCard(card),true);
});

test('Microsoft AI builder opens the existing Bubbles specialist without copying credentials or spawning a second agent',()=>{
 const launcher=readFileSync(new URL('../source-quick-cards.mjs',import.meta.url),'utf8');
 assert.match(launcher,/card\.id==='microsoft-ai-builder'/);
 assert.match(launcher,/\/source-quick-card\.html\?card=microsoft-ai-builder/);
 assert.match(launcher,/script\.src='\/bubbles-embed\.js'/);
 assert.match(launcher,/bubbleRole='specialist'/);
 assert.doesNotMatch(launcher,/fetch\(['"]https:\/\/github\.com\/www-infinity4\/AI3/);
});
