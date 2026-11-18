import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('featured and detailed feed cards expose only one actionable Follow control',()=>{
 const feed=source('quanta-feed.mjs');
 const oracle=source('oracle-card-deck.js');
 const actions=source('quanta-card-actions.mjs');
 assert.doesNotMatch(feed,/buttons\.append\(followButton\(selected,refresh\)\)/,
  'featured card must use its existing mounted toolbar');
 assert.doesNotMatch(feed,/actions\.append\(followButton\(card,renderDetailAgain\)\)/,
  'detail card must use the same mounted action toolbar');
 assert.match(feed,/mountCardTools\(tools,selected\)/);
 assert.match(oracle,/\{showFollow:false\}/,
  'Oracle navigation already has its own Follow action');
 assert.match(actions,/if\(options\.showFollow!==false\)/);
});

test('Oracle and feed recommendations present the next card without personal-sounding inferences',()=>{
 const oracle=source('oracle-card-deck.js');
 const feed=source('quanta-feed.mjs');
 assert.doesNotMatch(oracle,/proposed\.title\+' · '\+pick\.reason/);
 assert.doesNotMatch(feed,/Next direction · '\+lastReason/);
 assert.match(oracle,/Next card:/);
});

test('source-backed Quick Cards show the inline publisher Follow instead of duplicate Oracle Follow',()=>{
 const oracle=source('oracle-card-deck.js');
 const actions=source('quanta-card-actions.mjs');
 const premium=source('premium-source-cards.mjs');
 assert.match(oracle,/follow\.hidden=!active\|\|active\.id\.startsWith\('source-'\)/,
  'Hide only the redundant Oracle Follow for source cards');
 assert.match(oracle,/\{showFollow:false\}/,
  'Do not mount a second dynamic Follow toolbar on the moved Oracle card');
 assert.match(actions,/if\(options\.showFollow!==false\)/,
  'Source publisher toolbars retain their own valid Follow control');
 assert.match(premium,/mountCardActions\(actions,\{\.\.\.card,/,
  'Inline publisher Follow remains available');
});
