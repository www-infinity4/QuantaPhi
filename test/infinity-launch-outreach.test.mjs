import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('StarMaker portable card mounts real existing interactive Quick Card implementation',()=>{
 const page=read('starmaker-embed.html'),source=read('starmaker-embed.mjs');
 assert.match(source,/mountCardTools\(document\.getElementById\('starmakerLive'\),card\)/);
 assert.match(source,/import \{mountCardTools\} from '\.\/quanta-card-experience\.mjs'/);
 assert.match(page,/id="starmakerLive"/);
 assert.match(page,/id="smEmbedCode"/);
 assert.match(source,/allow="microphone"/);
 assert.match(source,/referrerpolicy="strict-origin-when-cross-origin"/);
 assert.match(page,/starmakerstudios\.com\/en\/web-login/);
 assert.match(page,/play\.google\.com\/store\/apps\/details\?id=com\.starmakerinteractive\.starmaker/);
 assert.doesNotMatch(source,/apiKey|clientSecret|accessToken|localStorage\.setItem/);
});
test('Product launch showcases the playable actual StarMaker demo with accurately labeled future work',()=>{
 const page=read('infinity-launch.html');
 assert.match(page,/<iframe src="\/starmaker-embed\.html"/);
 assert.match(page,/id="starmaker"/);
 assert.match(page,/Visa, Chime and checkout/);
 assert.match(page,/Neither Visa nor Chime is represented as an active QuantaPhi payment partner/);
 assert.match(page,/physical delivery robots are a separate research vision/i);
 assert.match(page,/github\.com\/www-infinity4\/QuantaPhi\/pull\/1114/);
 assert.match(page,/github\.com\/www-infinity4\/QuantaPhi\/pull\/1119/);
});
test('Commercial email is a linked static card rather than broken executable embed, with compliance fields required',()=>{
 const bulk=read('outreach/infinity-campaign-email.html');
 const partner=read('outreach/starmaker-partner-demo-email.html');
 assert.match(bulk,/https:\/\/quantaphi\.org\/starmaker-embed\.html/);
 assert.match(partner,/https:\/\/quantaphi\.org\/starmaker-embed\.html/);
 assert.match(bulk,/\{\{POSTAL_ADDRESS\}\}/);
 assert.match(bulk,/\{\{UNSUBSCRIBE_URL\}\}/);
 assert.doesNotMatch(bulk,/<iframe|<script/i);
 assert.doesNotMatch(partner,/<iframe|<script/i);
 assert.match(read('outreach/CAMPAIGN-RUNBOOK.md'),/No scraped, purchased or guessed addresses/);
});
