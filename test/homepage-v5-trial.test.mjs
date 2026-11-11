import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const raw = path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const home=raw('index.html'),trial=raw('homepage-v5.html');
test('V5 remains a separately accessible trial instead of replacing the functioning QuantaPhi homepage',()=>{
  assert.match(home,/id="oracleCardDeck"/);
  assert.match(home,/id="quantaDiscoveryFeed"/);
  assert.match(home,/oracle-card-deck\.js/);
  assert.match(home,/\/homepage-v5\.html/);
  assert.match(trial,/<!doctype html>/i);
  assert.match(trial,/<meta name="robots" content="noindex,nofollow">/);
  assert.match(trial,/This is a design and algorithm simulation, not a live ad feed/);
  assert.match(trial,/href="\/"/);
  assert.doesNotMatch(trial,/<script[^>]+(?:googletagmanager|adsbygoogle)/i);
});
test('V5 includes all desired trial views, no auto publishing or automatic tracking',()=>{
 for(const label of ['Public','For You','Following','Sports','News','Developers'])assert.ok(trial.includes(label),label);
 assert.match(trial,/qp:v5:homepage:review:settings/);
 assert.match(trial,/qp:v5:homepage:review:follows/);
 assert.match(trial,/campaign/);
 assert.match(trial,/prefers-reduced-motion/);
 assert.doesNotMatch(trial,/\bfetch\s*\(/);
 assert.doesNotMatch(trial,/window\.location\.(?:replace|assign)\s*\(/);
});
test('all embedded V5 JavaScript compiles without external runtime dependencies',()=>{
 const inline=[...trial.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(v=>v[1]);
 assert.ok(inline.length>0);
 for(const code of inline)assert.doesNotThrow(()=>new vm.Script(code));
});
