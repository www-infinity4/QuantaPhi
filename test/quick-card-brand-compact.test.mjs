import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Google and CNN source hero images are compact only in the Oracle viewer on small screens',()=>{
 const css=src('quick-card-brand-compact.css');
 const main=src('index.html');
 assert.match(main,/quick-card-brand-compact\.css\?v=20261101-compact1/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/\.qcx-art\[data-brand="google"\]/);
 assert.match(css,/\.qcx-art\[data-brand="cnn"\]/);
 assert.match(css,/min-height:96px/);
 assert.match(css,/\.qcx-google-wordmark/);
 assert.doesNotMatch(css,/display:none/);
 assert.doesNotMatch(css,/\.qca-controls/);
 // Every selector that changes a source-art element must be restricted to
 // the Oracle stage and exactly the Google/CNN brand; never affect other cards.
 const selectors=[...css.matchAll(/([^{}]+)\{/g)]
  .flatMap(m=>m[1].split(',').map(s=>s.trim()))
  .filter(s=>s.includes('.qcx-art'));
 assert.ok(selectors.length>=8);
 for(const selector of selectors){
  assert.ok(selector.startsWith('body.oracle-quanta .oracle-card-deck-stage>article.iqc-card '),selector);
  assert.match(selector,/\.qcx-art\[data-brand="(?:google|cnn)"\]/);
  assert.doesNotMatch(selector,/\[data-brand="(?:facebook|youtube|ebay)"\]/);
 }
});
