import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cards,findCard} from '../bubbles-card-catalog.mjs';
import {DISCOVERY_CARDS,findDiscovery,safeDiscovery} from '../quanta-feed-catalog.mjs';
const html=readFileSync(new URL('../x-money.html',import.meta.url),'utf8');
test('X Money Quick Card has a unique Bubbles app route and safe discovery entry',()=>{
 const card=findCard('x money');
 assert.equal(card?.url,'/x-money.html');
 assert.ok(cards.some(c=>c.id==='x-money'));
 const discovered=findDiscovery('x-money');
 assert.ok(discovered);
 assert.ok(safeDiscovery(discovered));
 assert.equal(discovered.url,'https://money.x.com/en');
});
test('official-source sign-in and published financial FAQ; no fake sign-in form',()=>{
 assert.match(html,/https:\/\/money\.x\.com\/en/);
 assert.match(html,/https:\/\/x\.com\/login\?/);
 assert.match(html,/https:\/\/money\.x\.com\/en\/i\/faq/);
 assert.doesNotMatch(html,/<input[^>]*(password|ssn|account|routing)/i);
 assert.match(html,/not an FDIC-insured bank/i);
 assert.match(html,/identity verification/i);
 assert.match(html,/sign in.*X/i);
});
test('Infinity Money and website-phone concepts cannot be confused with deployed money services',()=>{
 assert.match(html,/independent discovery card/i);
 assert.match(html,/Provider activation: not connected/i);
 assert.match(html,/No telephone number is sold or assigned/i);
 assert.match(html,/No banking, payouts, deposits or card issuance are activated/i);
 assert.match(html,/Illustration only/i);
 assert.match(html,/Star Coins minted/i);
});
test('required actions and mobile responsive controls are present',()=>{
 for(const label of ['Share','Collect','+1 Build','data-tab','aria-selected','viewport','@media'])assert.ok(html.includes(label),label);
 assert.ok(html.includes('navigator.share'));
 assert.ok(html.includes('quick-card-builder.html'));
});
