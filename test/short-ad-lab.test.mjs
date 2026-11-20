import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../short-ad-lab.html',import.meta.url),'utf8');
test('independent four-second ad avoids fake paid partnership, autoplay audio, payments and unlicensed media',()=>{
 assert.match(html,/Fast-lane micro-ad lab/);
 assert.match(html,/Not sponsored, endorsed or licensed by Hershey/);
 assert.match(html,/href="https:\/\/www\.hersheyland\.com\/bubbleyum"/);
 assert.match(html,/setTimeout\(\(\)=>\{[^]*?4000\)/);
 assert.match(html,/prefers-reduced-motion:reduce/);
 assert.match(html,/Hide animation/);
 assert.match(html,/Replay four-second spot/);
 assert.match(html,/No purchase is made on QuantaPhi/);
 assert.doesNotMatch(html,/<(?:img|audio|video|iframe)\b/i);
 assert.doesNotMatch(html,/fetch\(|sendBeacon|localStorage|sessionStorage|document\.cookie/);
});
